import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { SupplierProduct } from './entities/supplier-product.entity';
import { Supplier } from '../entities/supplier.entity';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, ProductStatus } from '@erp/shared-types';
import {
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
  QuerySupplierProductDto,
  SupplierProductResponseDto,
  PaginatedSupplierProductsResponseDto,
} from './dto';
import {
  toSupplierProductResponseDto,
  toPublicSupplierProductSnapshot,
} from './mappers/supplier-product.mapper';

export function escapeLikePattern(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&');
}

@Injectable()
export class SupplierProductsService {
  constructor(
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new supplier product mapping with transactional concurrency locking and audit trail.
   */
  async create(
    supplierId: string,
    dto: CreateSupplierProductDto,
    actorId: string,
  ): Promise<SupplierProductResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Verify Supplier exists and is active
      const supplier = await manager.getRepository(Supplier).findOne({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(
          `Proveedor con ID "${supplierId}" no encontrado`,
        );
      }
      if (!supplier.isActive) {
        throw new BadRequestException(
          'No es posible asociar productos a un proveedor inactivo',
        );
      }

      // 2. Lock Product Row (pessimistic_write) to serialize validations & primary assignments
      const product = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id = :productId', { productId: dto.productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!product) {
        throw new NotFoundException(
          `Producto con ID "${dto.productId}" no encontrado`,
        );
      }
      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          'No es posible asociar un producto inactivo al proveedor',
        );
      }

      // 3. Verify Purchase Unit exists
      const unit = await manager.getRepository(Unit).findOne({
        where: { id: dto.purchaseUnitId },
      });
      if (!unit) {
        throw new NotFoundException(
          `Unidad con ID "${dto.purchaseUnitId}" no encontrada`,
        );
      }

      // 4. Validate Conversion Factor against Base Unit
      const factorDecimal = new Decimal(dto.conversionFactorToBase);
      if (dto.purchaseUnitId === product.baseUnitId) {
        if (!factorDecimal.equals(1)) {
          throw new BadRequestException(
            'Cuando la unidad de compra coincide con la unidad base del producto, el factor de conversión debe ser exactamente 1',
          );
        }
      } else {
        if (!factorDecimal.greaterThan(0)) {
          throw new BadRequestException(
            'El factor de conversión debe ser estrictamente mayor a 0',
          );
        }
      }

      // 5. Primary Supplier Demotion within locked transaction
      if (dto.isPrimarySupplier) {
        const existingPrimary = await manager
          .getRepository(SupplierProduct)
          .findOne({
            where: { productId: dto.productId, isPrimarySupplier: true },
          });
        if (existingPrimary) {
          const prevSnapshot = toPublicSupplierProductSnapshot(existingPrimary);
          existingPrimary.isPrimarySupplier = false;
          const demotedSaved = await manager
            .getRepository(SupplierProduct)
            .save(existingPrimary);

          await this.auditService.record(manager, {
            actorId,
            action: AuditAction.UPDATE,
            entityName: 'SupplierProduct',
            entityId: demotedSaved.id,
            previousValues: prevSnapshot,
            newValues: toPublicSupplierProductSnapshot(demotedSaved),
          });
        }
      }

      // 6. Create and Save Mapping
      const trimmedSku = dto.supplierExternalCode.trim();
      const trimmedDesc =
        dto.supplierDescription && dto.supplierDescription.trim() !== ''
          ? dto.supplierDescription.trim()
          : null;
      const costNet =
        dto.usualCostNet !== undefined && dto.usualCostNet !== null
          ? new Decimal(dto.usualCostNet).toFixed(4)
          : null;

      const supplierProduct = manager.getRepository(SupplierProduct).create({
        supplierId,
        productId: dto.productId,
        supplierExternalCode: trimmedSku,
        supplierDescription: trimmedDesc,
        purchaseUnitId: dto.purchaseUnitId,
        conversionFactorToBase: factorDecimal.toFixed(4),
        usualCostNet: costNet,
        isPrimarySupplier: Boolean(dto.isPrimarySupplier),
      });

      let saved: SupplierProduct;
      try {
        saved = await manager
          .getRepository(SupplierProduct)
          .save(supplierProduct);
      } catch (err: any) {
        this.handleDatabaseError(err, trimmedSku);
      }

      // 7. Record Audit
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.CREATE,
        entityName: 'SupplierProduct',
        entityId: saved.id,
        previousValues: null,
        newValues: toPublicSupplierProductSnapshot(saved),
      });

      return this.findOneWithRelations(manager, saved.id);
    });
  }

  /**
   * Returns a paginated list of supplier product mappings with search and sorting.
   */
  async findAll(
    supplierId: string,
    query: QuerySupplierProductDto,
  ): Promise<PaginatedSupplierProductsResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;
    const skip = (page - 1) * limit;

    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(
        `Proveedor con ID "${supplierId}" no encontrado`,
      );
    }

    const qb = this.supplierProductRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect('product.baseUnit', 'productBaseUnit')
      .leftJoinAndSelect('sp.purchaseUnit', 'purchaseUnit')
      .where('sp.supplierId = :supplierId', { supplierId });

    if (search && search.trim() !== '') {
      const escaped = escapeLikePattern(search.trim());
      qb.andWhere(
        '(sp.supplierExternalCode ILIKE :search OR sp.supplierDescription ILIKE :search OR product.internalCode ILIKE :search OR product.name ILIKE :search)',
        { search: `%${escaped}%` },
      );
    }

    const sortMap: Record<string, string> = {
      supplierExternalCode: 'sp.supplierExternalCode',
      productInternalCode: 'product.internalCode',
      productName: 'product.name',
      isPrimarySupplier: 'sp.isPrimarySupplier',
      createdAt: 'sp.createdAt',
      updatedAt: 'sp.updatedAt',
    };

    const sortCol = sortMap[sortBy] || 'sp.createdAt';
    const dir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortCol, dir).addOrderBy('sp.id', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items.map(toSupplierProductResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Returns a single supplier product mapping by ID, ensuring supplier ownership.
   */
  async findOne(
    supplierId: string,
    associationId: string,
  ): Promise<SupplierProductResponseDto> {
    const item = await this.supplierProductRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect('product.baseUnit', 'productBaseUnit')
      .leftJoinAndSelect('sp.purchaseUnit', 'purchaseUnit')
      .where('sp.id = :associationId AND sp.supplierId = :supplierId', {
        associationId,
        supplierId,
      })
      .getOne();

    if (!item) {
      throw new NotFoundException(
        `Asociación de producto con ID "${associationId}" no encontrada para este proveedor`,
      );
    }

    return toSupplierProductResponseDto(item);
  }

  /**
   * Updates an existing supplier product mapping.
   */
  async update(
    supplierId: string,
    associationId: string,
    dto: UpdateSupplierProductDto,
    actorId: string,
  ): Promise<SupplierProductResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 1. Verify Supplier
      const supplier = await manager.getRepository(Supplier).findOne({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(
          `Proveedor con ID "${supplierId}" no encontrado`,
        );
      }
      if (!supplier.isActive) {
        throw new BadRequestException(
          'No es posible modificar el catálogo de un proveedor inactivo',
        );
      }

      // 2. Find target association
      const target = await manager.getRepository(SupplierProduct).findOne({
        where: { id: associationId, supplierId },
      });
      if (!target) {
        throw new NotFoundException(
          `Asociación de producto con ID "${associationId}" no encontrada para este proveedor`,
        );
      }

      // 3. Lock Product Row (pessimistic_write)
      const product = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id = :productId', { productId: target.productId })
        .setLock('pessimistic_write')
        .getOne();

      if (!product) {
        throw new NotFoundException('Producto asociado no encontrado');
      }

      // 4. Validate Purchase Unit & Conversion Factor
      const nextUnitId = dto.purchaseUnitId ?? target.purchaseUnitId;
      const nextFactorDecimal =
        dto.conversionFactorToBase !== undefined
          ? new Decimal(dto.conversionFactorToBase)
          : new Decimal(target.conversionFactorToBase);

      if (dto.purchaseUnitId !== undefined) {
        const unit = await manager.getRepository(Unit).findOne({
          where: { id: nextUnitId },
        });
        if (!unit) {
          throw new NotFoundException(
            `Unidad con ID "${nextUnitId}" no encontrada`,
          );
        }
      }

      if (nextUnitId === product.baseUnitId) {
        if (!nextFactorDecimal.equals(1)) {
          throw new BadRequestException(
            'Cuando la unidad de compra coincide con la unidad base, el factor debe ser exactamente 1',
          );
        }
      } else {
        if (!nextFactorDecimal.greaterThan(0)) {
          throw new BadRequestException(
            'El factor de conversión debe ser estrictamente mayor a 0',
          );
        }
      }

      // 5. Primary Supplier Logic
      if (dto.isPrimarySupplier === true && !target.isPrimarySupplier) {
        const existingPrimary = await manager
          .getRepository(SupplierProduct)
          .findOne({
            where: { productId: target.productId, isPrimarySupplier: true },
          });
        if (existingPrimary && existingPrimary.id !== target.id) {
          const prevSnapshot = toPublicSupplierProductSnapshot(existingPrimary);
          existingPrimary.isPrimarySupplier = false;
          const demotedSaved = await manager
            .getRepository(SupplierProduct)
            .save(existingPrimary);

          await this.auditService.record(manager, {
            actorId,
            action: AuditAction.UPDATE,
            entityName: 'SupplierProduct',
            entityId: demotedSaved.id,
            previousValues: prevSnapshot,
            newValues: toPublicSupplierProductSnapshot(demotedSaved),
          });
        }
      }

      // 6. Normalization & Delta Check
      const normalizedSku =
        dto.supplierExternalCode !== undefined
          ? dto.supplierExternalCode.trim()
          : target.supplierExternalCode;
      const normalizedDesc =
        dto.supplierDescription !== undefined
          ? dto.supplierDescription && dto.supplierDescription.trim() !== ''
            ? dto.supplierDescription.trim()
            : null
          : target.supplierDescription;
      const normalizedCost =
        dto.usualCostNet !== undefined
          ? dto.usualCostNet !== null
            ? new Decimal(dto.usualCostNet).toFixed(4)
            : null
          : target.usualCostNet !== null
            ? new Decimal(target.usualCostNet).toFixed(4)
            : null;
      const normalizedPrimary =
        dto.isPrimarySupplier !== undefined
          ? dto.isPrimarySupplier
          : target.isPrimarySupplier;
      const normalizedFactor = nextFactorDecimal.toFixed(4);

      const hasSkuChange = normalizedSku !== target.supplierExternalCode;
      const hasDescChange = normalizedDesc !== target.supplierDescription;
      const hasUnitChange = nextUnitId !== target.purchaseUnitId;
      const hasFactorChange =
        normalizedFactor !==
        new Decimal(target.conversionFactorToBase).toFixed(4);
      const hasCostChange =
        normalizedCost !==
        (target.usualCostNet !== null
          ? new Decimal(target.usualCostNet).toFixed(4)
          : null);
      const hasPrimaryChange = normalizedPrimary !== target.isPrimarySupplier;

      if (
        !hasSkuChange &&
        !hasDescChange &&
        !hasUnitChange &&
        !hasFactorChange &&
        !hasCostChange &&
        !hasPrimaryChange
      ) {
        throw new BadRequestException(
          'No se detectaron cambios efectivos en la actualización',
        );
      }

      const previousSnapshot = toPublicSupplierProductSnapshot(target);

      target.supplierExternalCode = normalizedSku;
      target.supplierDescription = normalizedDesc;
      target.purchaseUnitId = nextUnitId;
      target.conversionFactorToBase = normalizedFactor;
      target.usualCostNet = normalizedCost;
      target.isPrimarySupplier = normalizedPrimary;

      let saved: SupplierProduct;
      try {
        saved = await manager.getRepository(SupplierProduct).save(target);
      } catch (err: any) {
        this.handleDatabaseError(err, normalizedSku);
      }

      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.UPDATE,
        entityName: 'SupplierProduct',
        entityId: saved.id,
        previousValues: previousSnapshot,
        newValues: toPublicSupplierProductSnapshot(saved),
      });

      return this.findOneWithRelations(manager, saved.id);
    });
  }

  /**
   * Physically deletes a supplier product mapping and records AuditAction.DELETE.
   */
  async delete(
    supplierId: string,
    associationId: string,
    actorId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager: EntityManager) => {
      const target = await manager.getRepository(SupplierProduct).findOne({
        where: { id: associationId, supplierId },
      });
      if (!target) {
        throw new NotFoundException(
          `Asociación con ID "${associationId}" no encontrada para este proveedor`,
        );
      }

      const previousSnapshot = toPublicSupplierProductSnapshot(target);

      // Record audit before physical delete
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.DELETE,
        entityName: 'SupplierProduct',
        entityId: target.id,
        previousValues: previousSnapshot,
        newValues: null,
      });

      try {
        await manager.getRepository(SupplierProduct).delete({ id: target.id });
      } catch (err: any) {
        const code = err?.driverError?.code ?? err?.code;
        if (code === '23503') {
          throw new ConflictException(
            'No es posible eliminar la asociación porque existen compras o registros asociados',
          );
        }
        throw err;
      }
    });
  }

  private async findOneWithRelations(
    manager: EntityManager,
    id: string,
  ): Promise<SupplierProductResponseDto> {
    const item = await manager
      .getRepository(SupplierProduct)
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect('product.baseUnit', 'productBaseUnit')
      .leftJoinAndSelect('sp.purchaseUnit', 'purchaseUnit')
      .where('sp.id = :id', { id })
      .getOne();

    if (!item) {
      throw new NotFoundException(
        `Asociación con ID "${id}" no encontrada tras la operación`,
      );
    }

    return toSupplierProductResponseDto(item);
  }

  private handleDatabaseError(err: any, sku: string): never {
    const code = err?.driverError?.code ?? err?.code;
    const constraint = err?.driverError?.constraint ?? err?.constraint;

    if (code === '23505') {
      if (
        constraint?.includes('supplier_sku') ||
        constraint === 'uq_supplier_products_supplier_sku_upper'
      ) {
        throw new ConflictException(
          `El código externo "${sku}" ya está registrado para otro producto de este proveedor`,
        );
      }
      if (
        constraint?.includes('supplier_product') ||
        constraint === 'uq_supplier_products_supplier_product'
      ) {
        throw new ConflictException(
          'El producto ya se encuentra asociado a este proveedor',
        );
      }
      if (
        constraint?.includes('primary_per_product') ||
        constraint === 'uq_supplier_products_primary_per_product'
      ) {
        throw new ConflictException(
          'Ya existe otro proveedor habitual para este producto',
        );
      }
      throw new ConflictException(
        'Conflicto de unicidad en los datos del catálogo',
      );
    }
    throw err;
  }
}

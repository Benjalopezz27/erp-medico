import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import {
  ProductStatus,
  StockMovementType,
  QuarantineStatus,
  QuarantineResolution,
  AuditAction,
} from '@erp/shared-types';
import { QuarantineStock } from './entities/quarantine-stock.entity';
import { Product } from '../products/entities/product.entity';
import { StockService } from '../stock/stock.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateQuarantineDto,
  QueryQuarantineDto,
  ResolveQuarantineDto,
  QuarantineStockResponseDto,
  PaginatedQuarantineResponseDto,
} from './dto';

@Injectable()
export class QuarantineService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(QuarantineStock)
    private readonly quarantineRepository: Repository<QuarantineStock>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Transfers a positive quantity from saleable available stock to quarantine.
   * Atomically records an AJUSTE_SALIDA ledger movement, creates QuarantineStock,
   * and records an audit log.
   */
  async createEntry(
    dto: CreateQuarantineDto,
    actorId: string,
  ): Promise<QuarantineStockResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
      relations: ['baseUnit'],
    });

    if (!product) {
      throw new NotFoundException('El producto especificado no existe.');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        'No se puede ingresar a cuarentena un producto inactivo.',
      );
    }

    const savedId = await this.dataSource.transaction(async (manager) => {
      // 1. Record stock movement (AJUSTE_SALIDA)
      const movement = await this.stockService.recordMovement(
        {
          productId: dto.productId,
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: dto.quantityBase,
          reason: `Ingreso a cuarentena: ${dto.reason.trim()}`,
          userId: actorId,
        },
        manager,
      );

      // 2. Create QuarantineStock record
      const quarantine = manager.create(QuarantineStock, {
        productId: dto.productId,
        quantityBase: new Decimal(dto.quantityBase).toFixed(2),
        reason: dto.reason.trim(),
        status: QuarantineStatus.EN_CUARENTENA,
        entryActorId: actorId,
        entryMovementId: movement.id,
      });

      const saved = await manager.save(QuarantineStock, quarantine);

      // 3. Record Audit Log
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.CREATE,
        entityName: 'QuarantineStock',
        entityId: saved.id,
        previousValues: null,
        newValues: {
          productId: saved.productId,
          quantityBase: saved.quantityBase,
          reason: saved.reason,
          status: saved.status,
          entryActorId: saved.entryActorId,
          entryMovementId: saved.entryMovementId,
        },
      });

      return saved.id;
    });

    const fullEntity = await this.findOneWithRelations(savedId);
    return this.mapToResponseDto(fullEntity);
  }

  /**
   * Queries paginated quarantine records with product details, actors, and filters.
   */
  async findAll(
    query: QueryQuarantineDto,
  ): Promise<PaginatedQuarantineResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.quarantineRepository
      .createQueryBuilder('quarantine')
      .innerJoinAndSelect('quarantine.product', 'product')
      .innerJoinAndSelect('product.baseUnit', 'baseUnit')
      .innerJoinAndSelect('quarantine.entryActor', 'entryActor')
      .leftJoinAndSelect('quarantine.resolvedByActor', 'resolvedByActor');

    if (query.productId) {
      qb.andWhere('quarantine.productId = :productId', {
        productId: query.productId,
      });
    }

    if (query.status) {
      qb.andWhere('quarantine.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim().length > 0) {
      const escaped = query.search.trim().replace(/[%_\\]/g, '\\$&');
      qb.andWhere(
        '(UPPER(product.internalCode) LIKE UPPER(:searchLike) OR product.name ILIKE :searchLike)',
        { searchLike: `%${escaped}%` },
      );
    }

    qb.orderBy('quarantine.createdAt', 'DESC').addOrderBy(
      'quarantine.id',
      'DESC',
    );
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
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
   * Atomically resolves a quarantine record using pessimistic write lock.
   * Handles REINGRESO (via AJUSTE_ENTRADA), MERMA, and DEVOLUCION_PROVEEDOR.
   */
  async resolve(
    id: string,
    dto: ResolveQuarantineDto,
    actorId: string,
  ): Promise<QuarantineStockResponseDto> {
    const savedId = await this.dataSource.transaction(async (manager) => {
      // 1. Acquire pessimistic write lock (FOR UPDATE)
      const quarantine = await manager
        .getRepository(QuarantineStock)
        .createQueryBuilder('quarantine')
        .setLock('pessimistic_write')
        .where('quarantine.id = :id', { id })
        .getOne();

      if (!quarantine) {
        throw new NotFoundException(
          'El registro de cuarentena especificado no existe.',
        );
      }

      if (quarantine.status !== QuarantineStatus.EN_CUARENTENA) {
        throw new ConflictException(
          'El registro de cuarentena ya ha sido resuelto previamente.',
        );
      }

      const previousValues = {
        status: quarantine.status,
        resolvedByActorId: quarantine.resolvedByActorId,
        resolutionNotes: quarantine.resolutionNotes,
        resolutionMovementId: quarantine.resolutionMovementId,
        resolvedAt: quarantine.resolvedAt,
      };

      let resolutionMovementId: string | null = null;
      let nextStatus: QuarantineStatus;

      if (dto.resolution === QuarantineResolution.REINGRESO) {
        nextStatus = QuarantineStatus.REINGRESADO_STOCK;
        const movement = await this.stockService.recordMovement(
          {
            productId: quarantine.productId,
            movementType: StockMovementType.AJUSTE_ENTRADA,
            quantityBase: Number(quarantine.quantityBase),
            reason: `Reingreso desde cuarentena: ${dto.resolutionNotes.trim()}`,
            userId: actorId,
          },
          manager,
        );
        resolutionMovementId = movement.id;
      } else if (dto.resolution === QuarantineResolution.MERMA) {
        nextStatus = QuarantineStatus.MERMA_CONFIRMADA;
      } else if (dto.resolution === QuarantineResolution.DEVOLUCION_PROVEEDOR) {
        nextStatus = QuarantineStatus.DEVOLUCION_PROVEEDOR;
      } else {
        throw new BadRequestException('Tipo de resolución no válido.');
      }

      quarantine.status = nextStatus;
      quarantine.resolvedByActorId = actorId;
      quarantine.resolutionNotes = dto.resolutionNotes.trim();
      quarantine.resolutionMovementId = resolutionMovementId;
      quarantine.resolvedAt = new Date();

      const saved = await manager.save(QuarantineStock, quarantine);

      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.UPDATE,
        entityName: 'QuarantineStock',
        entityId: saved.id,
        previousValues,
        newValues: {
          status: saved.status,
          resolution: dto.resolution,
          resolvedByActorId: saved.resolvedByActorId,
          resolutionNotes: saved.resolutionNotes,
          resolutionMovementId: saved.resolutionMovementId,
          resolvedAt: saved.resolvedAt,
        },
      });

      return saved.id;
    });

    const fullEntity = await this.findOneWithRelations(savedId);
    return this.mapToResponseDto(fullEntity);
  }

  /**
   * Helper to retrieve a single quarantine record with full product, units, and actor relations.
   */
  private async findOneWithRelations(id: string): Promise<QuarantineStock> {
    const entity = await this.quarantineRepository
      .createQueryBuilder('quarantine')
      .innerJoinAndSelect('quarantine.product', 'product')
      .innerJoinAndSelect('product.baseUnit', 'baseUnit')
      .innerJoinAndSelect('quarantine.entryActor', 'entryActor')
      .leftJoinAndSelect('quarantine.resolvedByActor', 'resolvedByActor')
      .where('quarantine.id = :id', { id })
      .getOne();

    if (!entity) {
      throw new NotFoundException(
        'El registro de cuarentena especificado no existe.',
      );
    }

    return entity;
  }

  /**
   * Maps a QuarantineStock entity with loaded relations to QuarantineStockResponseDto.
   */
  private mapToResponseDto(
    entity: QuarantineStock,
  ): QuarantineStockResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      product: {
        id: entity.product.id,
        internalCode: entity.product.internalCode,
        name: entity.product.name,
        baseUnit: {
          id: entity.product.baseUnit?.id || '',
          name: entity.product.baseUnit?.name || '',
          symbol: entity.product.baseUnit?.symbol || '',
        },
      },
      quantityBase: Number(entity.quantityBase),
      reason: entity.reason,
      status: entity.status,
      entryActorId: entity.entryActorId,
      entryActor: {
        id: entity.entryActor.id,
        name: entity.entryActor.name,
        email: entity.entryActor.email,
      },
      entryMovementId: entity.entryMovementId,
      resolvedByActorId: entity.resolvedByActorId || null,
      resolvedByActor: entity.resolvedByActor
        ? {
            id: entity.resolvedByActor.id,
            name: entity.resolvedByActor.name,
            email: entity.resolvedByActor.email,
          }
        : null,
      resolutionNotes: entity.resolutionNotes || null,
      resolutionMovementId: entity.resolutionMovementId || null,
      resolvedAt: entity.resolvedAt ? entity.resolvedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

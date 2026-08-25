import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AuditAction,
  sanitizeCuit,
  normalizeCuitForSearch,
  formatCuit,
} from '@erp/shared-types';
import { normalizeEmail } from '../../common/utils/string.utils';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/paginated-suppliers-response.dto';
import {
  toSupplierResponseDto,
  toPublicSupplierSnapshot,
} from './mappers/supplier.mapper';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'suppliers', status: 'initialized' };
  }

  /**
   * Creates a new supplier with canonical CUIT validation and atomic audit trail.
   */
  async create(
    dto: CreateSupplierDto,
    actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    const canonicalCuit = sanitizeCuit(dto.cuit);
    if (!canonicalCuit) {
      throw new BadRequestException('Formato de CUIT inválido');
    }

    const normalizedEmail = dto.email ? normalizeEmail(dto.email) : null;
    const normalizedPhone =
      dto.phone && dto.phone.trim() !== '' ? dto.phone.trim() : null;
    const normalizedWhatsapp =
      dto.whatsapp && dto.whatsapp.trim() !== ''
        ? dto.whatsapp.replace(/\D/g, '')
        : null;
    const normalizedAddress =
      dto.address && dto.address.trim() !== '' ? dto.address.trim() : null;

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const repo = manager.getRepository(Supplier);

      const existing = await repo.findOne({ where: { cuit: canonicalCuit } });
      if (existing) {
        throw new ConflictException(
          `Ya existe un proveedor registrado con el CUIT "${formatCuit(canonicalCuit)}"`,
        );
      }

      const supplier = repo.create({
        businessName: dto.businessName.trim(),
        cuit: canonicalCuit,
        taxCondition: dto.taxCondition,
        email: normalizedEmail,
        phone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
        address: normalizedAddress,
        isActive: true,
      });

      let saved: Supplier;
      try {
        saved = await repo.save(supplier);
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new ConflictException(
            `Ya existe un proveedor registrado con el CUIT "${formatCuit(canonicalCuit)}"`,
          );
        }
        throw err;
      }

      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityName: 'Supplier',
        entityId: saved.id,
        previousValues: null,
        newValues: toPublicSupplierSnapshot(saved),
      });

      return toSupplierResponseDto(saved);
    });
  }

  /**
   * Retrieves a paginated list of suppliers with filtering, searching, and stable sorting.
   */
  async findAll(
    query: QuerySupplierDto,
  ): Promise<PaginatedSuppliersResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const skip = (page - 1) * limit;
    const qb = this.supplierRepository.createQueryBuilder('supplier');

    if (search && search.trim() !== '') {
      const searchTrimmed = search.trim();
      const cuitDigits = normalizeCuitForSearch(searchTrimmed);

      if (cuitDigits.length > 0) {
        qb.andWhere(
          '(LOWER(supplier.businessName) LIKE :search OR supplier.cuit LIKE :cuitDigits)',
          {
            search: `%${searchTrimmed.toLowerCase()}%`,
            cuitDigits: `%${cuitDigits}%`,
          },
        );
      } else {
        qb.andWhere('LOWER(supplier.businessName) LIKE :search', {
          search: `%${searchTrimmed.toLowerCase()}%`,
        });
      }
    }

    if (isActive !== undefined) {
      qb.andWhere('supplier.isActive = :isActive', { isActive });
    }

    const allowedSortFields: Record<string, string> = {
      businessName: 'supplier.businessName',
      cuit: 'supplier.cuit',
      taxCondition: 'supplier.taxCondition',
      createdAt: 'supplier.createdAt',
      updatedAt: 'supplier.updatedAt',
    };

    const sortColumn = allowedSortFields[sortBy] || 'supplier.createdAt';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortColumn, direction)
      .addOrderBy('supplier.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [suppliers, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: suppliers.map(toSupplierResponseDto),
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
   * Retrieves a single supplier by ID or throws 404 NotFound.
   */
  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID "${id}" no encontrado`);
    }
    return toSupplierResponseDto(supplier);
  }

  /**
   * Updates an existing supplier within a transaction, checking for deltas and recording audit.
   */
  async update(
    id: string,
    dto: UpdateSupplierDto,
    actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const repo = manager.getRepository(Supplier);
      const target = await repo.findOne({ where: { id } });
      if (!target) {
        throw new NotFoundException(`Proveedor con ID "${id}" no encontrado`);
      }

      const canonicalCuit =
        dto.cuit !== undefined ? sanitizeCuit(dto.cuit) : undefined;
      if (dto.cuit !== undefined && !canonicalCuit) {
        throw new BadRequestException('Formato de CUIT inválido');
      }

      const normalizedEmail =
        dto.email !== undefined
          ? dto.email && dto.email.trim() !== ''
            ? normalizeEmail(dto.email)
            : null
          : target.email;

      const normalizedPhone =
        dto.phone !== undefined
          ? dto.phone && dto.phone.trim() !== ''
            ? dto.phone.trim()
            : null
          : target.phone;

      const normalizedWhatsapp =
        dto.whatsapp !== undefined
          ? dto.whatsapp && dto.whatsapp.trim() !== ''
            ? dto.whatsapp.replace(/\D/g, '')
            : null
          : target.whatsapp;

      const normalizedAddress =
        dto.address !== undefined
          ? dto.address && dto.address.trim() !== ''
            ? dto.address.trim()
            : null
          : target.address;

      const normalizedBusinessName =
        dto.businessName !== undefined
          ? dto.businessName.trim()
          : target.businessName;

      const normalizedTaxCondition =
        dto.taxCondition !== undefined ? dto.taxCondition : target.taxCondition;

      const normalizedIsActive =
        dto.isActive !== undefined ? dto.isActive : target.isActive;

      const hasNameChange = normalizedBusinessName !== target.businessName;
      const hasCuitChange =
        canonicalCuit !== undefined && canonicalCuit !== target.cuit;
      const hasTaxChange = normalizedTaxCondition !== target.taxCondition;
      const hasEmailChange = normalizedEmail !== target.email;
      const hasPhoneChange = normalizedPhone !== target.phone;
      const hasWhatsappChange = normalizedWhatsapp !== target.whatsapp;
      const hasAddressChange = normalizedAddress !== target.address;
      const hasActiveChange = normalizedIsActive !== target.isActive;

      if (
        !hasNameChange &&
        !hasCuitChange &&
        !hasTaxChange &&
        !hasEmailChange &&
        !hasPhoneChange &&
        !hasWhatsappChange &&
        !hasAddressChange &&
        !hasActiveChange
      ) {
        throw new BadRequestException(
          'No se detectaron cambios efectivos en la actualización',
        );
      }

      if (hasCuitChange) {
        const existing = await repo.findOne({ where: { cuit: canonicalCuit } });
        if (existing && existing.id !== target.id) {
          throw new ConflictException(
            `Ya existe un proveedor registrado con el CUIT "${formatCuit(canonicalCuit!)}"`,
          );
        }
      }

      const action =
        hasActiveChange && !normalizedIsActive
          ? AuditAction.DEACTIVATE
          : hasActiveChange && normalizedIsActive
            ? AuditAction.ACTIVATE
            : AuditAction.UPDATE;

      const previousSnapshot = toPublicSupplierSnapshot(target);

      target.businessName = normalizedBusinessName;
      if (hasCuitChange) target.cuit = canonicalCuit!;
      target.taxCondition = normalizedTaxCondition;
      target.email = normalizedEmail;
      target.phone = normalizedPhone;
      target.whatsapp = normalizedWhatsapp;
      target.address = normalizedAddress;
      target.isActive = normalizedIsActive;

      let saved: Supplier;
      try {
        saved = await repo.save(target);
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new ConflictException(
            `Ya existe un proveedor registrado con el CUIT "${formatCuit(target.cuit)}"`,
          );
        }
        throw err;
      }

      await this.auditService.record(manager, {
        actorId: actor.id,
        action,
        entityName: 'Supplier',
        entityId: saved.id,
        previousValues: previousSnapshot,
        newValues: toPublicSupplierSnapshot(saved),
      });

      return toSupplierResponseDto(saved);
    });
  }

  /**
   * Soft-deletes (deactivates) a supplier within a transaction and records audit.
   */
  async deactivate(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<SupplierResponseDto> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const repo = manager.getRepository(Supplier);
      const target = await repo.findOne({ where: { id } });
      if (!target) {
        throw new NotFoundException(`Proveedor con ID "${id}" no encontrado`);
      }

      if (!target.isActive) {
        throw new BadRequestException('El proveedor ya se encuentra inactivo');
      }

      const previousSnapshot = toPublicSupplierSnapshot(target);
      target.isActive = false;
      const saved = await repo.save(target);

      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.DEACTIVATE,
        entityName: 'Supplier',
        entityId: saved.id,
        previousValues: previousSnapshot,
        newValues: toPublicSupplierSnapshot(saved),
      });

      return toSupplierResponseDto(saved);
    });
  }
}

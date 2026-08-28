import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  AuditAction,
  CustomerErrorCode,
  CustomerSortField,
  isCustomerTaxConditionCompatible,
  normalizeCustomerDocumentForSearch,
  sanitizeCustomerDocument,
  UserRole,
} from '@erp/shared-types';
import { normalizeEmail } from '../../common/utils/string.utils';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto/customer-response.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import {
  toCustomerResponseDto,
  toPublicCustomerSnapshot,
} from './mappers/customer.mapper';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateCustomerDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    const document = this.normalizeDocument(dto.documentType, dto.cuitOrDni);
    this.validateTaxCondition(dto.documentType, dto.taxCondition);
    const creditLimit = this.normalizeCreditLimit(dto.creditLimit ?? '0');
    if (actor.role === UserRole.VENDEDOR && new Decimal(creditLimit).gt(0)) {
      throw new ForbiddenException({
        code: CustomerErrorCode.CUSTOMER_FORBIDDEN_CREDIT_LIMIT,
        message:
          'Los vendedores no pueden asignar un límite de crédito inicial superior a cero.',
      });
    }

    return this.executeWrite(async (manager) => {
      const repo = manager.getRepository(Customer);
      await this.ensureDocumentAvailable(repo, document);
      const customer = repo.create({
        businessName: dto.businessName.trim(),
        documentType: dto.documentType,
        cuitOrDni: document,
        taxCondition: dto.taxCondition,
        email: dto.email ? normalizeEmail(dto.email) : null,
        phone: this.optionalText(dto.phone),
        address: this.optionalText(dto.address),
        creditLimit,
        isActive: true,
      });
      const saved = await repo.save(customer);
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityName: 'Customer',
        entityId: saved.id,
        previousValues: null,
        newValues: toPublicCustomerSnapshot(saved),
      });
      return toCustomerResponseDto(saved);
    }, document);
  }

  async findAll(
    query: QueryCustomerDto,
  ): Promise<PaginatedCustomersResponseDto> {
    const { page = 1, limit = 10 } = query;
    const qb = this.customerRepository.createQueryBuilder('customer');
    qb.andWhere('customer.isActive = :isActive', {
      isActive: query.isActive ?? true,
    });
    if (query.taxCondition) {
      qb.andWhere('customer.taxCondition = :taxCondition', {
        taxCondition: query.taxCondition,
      });
    }
    if (query.search) {
      const term = query.search.trim();
      const digits = normalizeCustomerDocumentForSearch(term);
      if (digits) {
        qb.andWhere(
          '(LOWER(customer.businessName) LIKE :term OR customer.cuitOrDni LIKE :digits)',
          { term: `%${term.toLowerCase()}%`, digits: `%${digits}%` },
        );
      } else {
        qb.andWhere('LOWER(customer.businessName) LIKE :term', {
          term: `%${term.toLowerCase()}%`,
        });
      }
    }

    const columns: Record<CustomerSortField, string> = {
      businessName: 'customer.businessName',
      cuitOrDni: 'customer.cuitOrDni',
      taxCondition: 'customer.taxCondition',
      creditLimit: 'customer.creditLimit',
      createdAt: 'customer.createdAt',
      updatedAt: 'customer.updatedAt',
    };
    const direction = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(columns[query.sortBy ?? 'createdAt'], direction)
      .addOrderBy('customer.id', direction)
      .skip((page - 1) * limit)
      .take(limit);
    const [customers, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: customers.map(toCustomerResponseDto),
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

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) this.throwNotFound(id);
    return toCustomerResponseDto(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    if (
      actor.role === UserRole.VENDEDOR &&
      [dto.documentType, dto.cuitOrDni, dto.taxCondition, dto.creditLimit].some(
        (value) => value !== undefined,
      )
    ) {
      throw new ForbiddenException({
        code: CustomerErrorCode.CUSTOMER_FORBIDDEN_FIELD_UPDATE,
        message:
          'Los vendedores no pueden modificar documento, condición fiscal ni límite de crédito.',
      });
    }

    return this.executeWrite(async (manager) => {
      const repo = manager.getRepository(Customer);
      const target = await this.loadForUpdate(manager, id);
      const documentType = dto.documentType ?? target.documentType;
      const document =
        dto.cuitOrDni !== undefined || dto.documentType !== undefined
          ? this.normalizeDocument(
              documentType,
              dto.cuitOrDni ?? target.cuitOrDni,
            )
          : target.cuitOrDni;
      const taxCondition = dto.taxCondition ?? target.taxCondition;
      this.validateTaxCondition(documentType, taxCondition);
      const creditLimit =
        dto.creditLimit === undefined
          ? target.creditLimit
          : this.normalizeCreditLimit(dto.creditLimit);
      const next = {
        businessName: dto.businessName?.trim() ?? target.businessName,
        documentType,
        cuitOrDni: document,
        taxCondition,
        email:
          dto.email === undefined
            ? target.email
            : dto.email
              ? normalizeEmail(dto.email)
              : null,
        phone:
          dto.phone === undefined ? target.phone : this.optionalText(dto.phone),
        address:
          dto.address === undefined
            ? target.address
            : this.optionalText(dto.address),
        creditLimit,
      };
      const changed =
        next.businessName !== target.businessName ||
        next.documentType !== target.documentType ||
        next.cuitOrDni !== target.cuitOrDni ||
        next.taxCondition !== target.taxCondition ||
        next.email !== target.email ||
        next.phone !== target.phone ||
        next.address !== target.address ||
        !new Decimal(next.creditLimit).eq(target.creditLimit);
      if (!changed) {
        throw new BadRequestException({
          code: CustomerErrorCode.CUSTOMER_NO_EFFECTIVE_CHANGES,
          message: 'No se detectaron cambios efectivos en la actualización.',
        });
      }
      if (next.cuitOrDni !== target.cuitOrDni) {
        await this.ensureDocumentAvailable(repo, next.cuitOrDni, target.id);
      }
      const previousValues = toPublicCustomerSnapshot(target);
      Object.assign(target, next);
      const saved = await repo.save(target);
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityName: 'Customer',
        entityId: saved.id,
        previousValues,
        newValues: toPublicCustomerSnapshot(saved),
      });
      return toCustomerResponseDto(saved);
    }, dto.cuitOrDni);
  }

  deactivate(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.changeActiveState(id, false, actor);
  }

  reactivate(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.changeActiveState(id, true, actor);
  }

  private executeWrite<T>(
    operation: (manager: EntityManager) => Promise<T>,
    document?: string,
  ): Promise<T> {
    return this.dataSource.transaction(operation).catch((error) => {
      const code = this.databaseErrorCode(error);
      if (code === '23505') this.throwDuplicate(document ?? '');
      if (code === '40P01' || code === '40001') {
        throw new ConflictException({
          code: CustomerErrorCode.CUSTOMER_CONCURRENCY_CONFLICT,
          message:
            'El cliente fue modificado simultáneamente. Actualice los datos e intente nuevamente.',
        });
      }
      throw error;
    });
  }

  private changeActiveState(
    id: string,
    isActive: boolean,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.executeWrite(async (manager) => {
      const repo = manager.getRepository(Customer);
      const target = await this.loadForUpdate(manager, id);
      if (target.isActive === isActive) {
        throw new BadRequestException({
          code: isActive
            ? CustomerErrorCode.CUSTOMER_ALREADY_ACTIVE
            : CustomerErrorCode.CUSTOMER_ALREADY_INACTIVE,
          message: isActive
            ? 'El cliente ya se encuentra activo.'
            : 'El cliente ya se encuentra inactivo.',
        });
      }
      const previousValues = toPublicCustomerSnapshot(target);
      target.isActive = isActive;
      const saved = await repo.save(target);
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entityName: 'Customer',
        entityId: saved.id,
        previousValues,
        newValues: toPublicCustomerSnapshot(saved),
      });
      return toCustomerResponseDto(saved);
    });
  }

  private async loadForUpdate(
    manager: EntityManager,
    id: string,
  ): Promise<Customer> {
    const customer = await manager
      .createQueryBuilder(Customer, 'customer')
      .where('customer.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (!customer) this.throwNotFound(id);
    return customer;
  }

  private async ensureDocumentAvailable(
    repo: Repository<Customer>,
    document: string,
    excludedId?: string,
  ): Promise<void> {
    const existing = await repo.findOne({ where: { cuitOrDni: document } });
    if (existing && existing.id !== excludedId) this.throwDuplicate(document);
  }

  private normalizeDocument(
    type: Customer['documentType'],
    raw: string,
  ): string {
    const document = sanitizeCustomerDocument(type, raw);
    if (!document) {
      throw new BadRequestException({
        code: CustomerErrorCode.CUSTOMER_DOCUMENT_INVALID,
        message: 'El documento no es válido para el tipo indicado.',
        details: { documentType: type },
      });
    }
    return document;
  }

  private validateTaxCondition(
    type: Customer['documentType'],
    condition: Customer['taxCondition'],
  ): void {
    if (!isCustomerTaxConditionCompatible(type, condition)) {
      throw new BadRequestException({
        code: CustomerErrorCode.CUSTOMER_TAX_CONDITION_INCOMPATIBLE,
        message:
          'Los clientes identificados con DNI deben ser Consumidor Final.',
        details: { documentType: type, taxCondition: condition },
      });
    }
  }

  private normalizeCreditLimit(value: string): string {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
      this.throwInvalidCreditLimit();
    }
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || decimal.lt(0) || decimal.gt('999999999999.99')) {
      this.throwInvalidCreditLimit();
    }
    return decimal.toFixed(2);
  }

  private optionalText(value: string | null | undefined): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private throwInvalidCreditLimit(): never {
    throw new BadRequestException({
      code: CustomerErrorCode.CUSTOMER_INVALID_CREDIT_LIMIT,
      message:
        'El límite de crédito debe ser un string decimal no negativo con hasta dos decimales.',
    });
  }

  private throwDuplicate(document: string): never {
    throw new ConflictException({
      code: CustomerErrorCode.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
      message: 'Ya existe un cliente registrado con ese documento.',
      details: { cuitOrDni: document },
    });
  }

  private throwNotFound(id: string): never {
    throw new NotFoundException({
      code: CustomerErrorCode.CUSTOMER_NOT_FOUND,
      message: 'El cliente no existe.',
      details: { customerId: id },
    });
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    return (
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code
    );
  }
}

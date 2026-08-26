import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAction,
  ImporterErrorCode,
  ISupplierImportMapping,
} from '@erp/shared-types';
import { SupplierImportTemplate } from '../entities/supplier-import-template.entity';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateSupplierImportTemplateDto,
  UpdateSupplierImportTemplateDto,
  QuerySupplierImportTemplateDto,
  SupplierImportTemplateResponseDto,
} from '../dto';
import { SupplierImportTemplateMapper } from '../mappers/supplier-import-template.mapper';
import {
  normalizeHeader,
  computeHeaderFingerprint,
} from '../../../shared/parsers/secure-spreadsheet-parser';

@Injectable()
export class SupplierImportTemplatesService {
  constructor(
    @InjectRepository(SupplierImportTemplate)
    private readonly templateRepo: Repository<SupplierImportTemplate>,
    private readonly suppliersService: SuppliersService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validates semantic mapping against normalized headers and optional expected fingerprint.
   */
  validateMapping(
    mapping: ISupplierImportMapping,
    normalizedHeaders: string[],
    expectedFingerprint?: string,
  ): void {
    if (!mapping.supplierSku || !mapping.supplierSku.trim()) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD,
        message: 'El campo "supplierSku" es obligatorio en el mapeo.',
      });
    }

    if (!mapping.usualCostNet || !mapping.usualCostNet.trim()) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD,
        message: 'El campo "usualCostNet" es obligatorio en el mapeo.',
      });
    }

    const headerSet = new Set(normalizedHeaders.map((h) => normalizeHeader(h)));

    const assignedEntries = Object.entries(mapping).filter(
      ([, val]) =>
        val !== null && val !== undefined && String(val).trim() !== '',
    ) as Array<[keyof ISupplierImportMapping, string]>;

    const usedColumns = new Set<string>();

    for (const [field, rawCol] of assignedEntries) {
      const normalizedCol = normalizeHeader(rawCol);
      if (!headerSet.has(normalizedCol)) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
          message: `La columna "${rawCol}" asignada al campo "${field}" no existe entre los encabezados del archivo.`,
        });
      }

      if (usedColumns.has(normalizedCol)) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_MAPPING_DUPLICATE_COLUMN,
          message: `La columna "${rawCol}" ha sido asignada a múltiples campos semánticos. Cada columna solo puede usarse una vez.`,
        });
      }
      usedColumns.add(normalizedCol);
    }

    if (expectedFingerprint) {
      const computedFingerprint = computeHeaderFingerprint(normalizedHeaders);
      if (
        computedFingerprint.toLowerCase() !==
        expectedFingerprint.toLowerCase().trim()
      ) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_FINGERPRINT_MISMATCH,
          message:
            'El fingerprint proporcionado no coincide con el cálculo determinista de los encabezados.',
        });
      }
    }
  }

  /**
   * Normalizes all assigned column names in a mapping object.
   */
  normalizeMapping(raw: ISupplierImportMapping): ISupplierImportMapping {
    return {
      supplierSku: normalizeHeader(raw.supplierSku),
      usualCostNet: normalizeHeader(raw.usualCostNet),
      supplierDescription: raw.supplierDescription
        ? normalizeHeader(raw.supplierDescription)
        : null,
      rawQuantity: raw.rawQuantity ? normalizeHeader(raw.rawQuantity) : null,
      purchaseUnit: raw.purchaseUnit ? normalizeHeader(raw.purchaseUnit) : null,
    };
  }

  /**
   * Creates a new import template within an atomic transaction with audit logging.
   */
  async create(
    supplierId: string,
    dto: CreateSupplierImportTemplateDto,
    actorId: string,
  ): Promise<SupplierImportTemplateResponseDto> {
    const supplier = await this.suppliersService.findOne(supplierId);
    if (!supplier.isActive) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
        message: 'No se pueden crear plantillas para un proveedor inactivo.',
      });
    }

    const normalizedHeaders = dto.headers.map(normalizeHeader);
    this.validateMapping(dto.mapping, normalizedHeaders, dto.headerFingerprint);
    const normalizedMapping = this.normalizeMapping(dto.mapping);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(SupplierImportTemplate);
        const template = repo.create({
          supplierId,
          name: dto.name.trim(),
          headerFingerprint: dto.headerFingerprint.toLowerCase().trim(),
          mapping: normalizedMapping,
          headersSnapshot: normalizedHeaders,
        });

        const saved = await repo.save(template);

        await this.auditService.record(manager, {
          actorId,
          action: AuditAction.CREATE,
          entityName: 'SupplierImportTemplate',
          entityId: saved.id,
          previousValues: null,
          newValues: this.toAuditSnapshot(saved),
        });

        return SupplierImportTemplateMapper.toResponse(saved);
      });
    } catch (error) {
      this.handleUniqueViolation(error, dto.name);
    }
  }

  /**
   * Finds an exact matching template by supplier ID and header fingerprint.
   */
  async findByFingerprint(
    supplierId: string,
    headerFingerprint: string,
  ): Promise<SupplierImportTemplate | null> {
    return this.templateRepo.findOne({
      where: {
        supplierId,
        headerFingerprint: headerFingerprint.toLowerCase().trim(),
      },
    });
  }

  /**
   * Lists all templates for a given supplier with optional filters.
   */
  async findAllBySupplier(
    supplierId: string,
    query?: QuerySupplierImportTemplateDto,
  ): Promise<SupplierImportTemplateResponseDto[]> {
    await this.suppliersService.findOne(supplierId);

    const qb = this.templateRepo
      .createQueryBuilder('template')
      .where('template.supplier_id = :supplierId', { supplierId });

    if (query?.headerFingerprint) {
      qb.andWhere('template.header_fingerprint = :fingerprint', {
        fingerprint: query.headerFingerprint.toLowerCase().trim(),
      });
    }

    if (query?.search && query.search.trim()) {
      qb.andWhere('template.name ILIKE :search', {
        search: `%${query.search.trim()}%`,
      });
    }

    qb.orderBy('template.created_at', 'DESC');
    const list = await qb.getMany();
    return list.map((t) => SupplierImportTemplateMapper.toResponse(t));
  }

  /**
   * Retrieves a single template by supplier ID and template ID.
   */
  async findOne(
    supplierId: string,
    templateId: string,
  ): Promise<SupplierImportTemplateResponseDto> {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, supplierId },
    });

    if (!template) {
      throw new NotFoundException({
        code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
        message: `La plantilla con ID ${templateId} no existe para este proveedor.`,
      });
    }

    return SupplierImportTemplateMapper.toResponse(template);
  }

  /**
   * Updates an existing template within an atomic transaction with audit logging.
   */
  async update(
    supplierId: string,
    templateId: string,
    dto: UpdateSupplierImportTemplateDto,
    actorId: string,
  ): Promise<SupplierImportTemplateResponseDto> {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, supplierId },
    });

    if (!template) {
      throw new NotFoundException({
        code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
        message: `La plantilla con ID ${templateId} no existe para este proveedor.`,
      });
    }

    if (dto.name === undefined && dto.mapping === undefined) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_INVALID_MAPPING,
        message: 'Debe proporcionar al menos un campo para actualizar.',
      });
    }

    const previousSnapshot = { ...template };

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_INVALID_MAPPING,
          message: 'El nombre de la plantilla no puede estar vacío.',
        });
      }
      template.name = trimmed;
    }

    if (dto.mapping !== undefined) {
      this.validateMapping(dto.mapping, template.headersSnapshot);
      template.mapping = this.normalizeMapping(dto.mapping);
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(SupplierImportTemplate);
        const saved = await repo.save(template);

        await this.auditService.record(manager, {
          actorId,
          action: AuditAction.UPDATE,
          entityName: 'SupplierImportTemplate',
          entityId: saved.id,
          previousValues: this.toAuditSnapshot(previousSnapshot),
          newValues: this.toAuditSnapshot(saved),
        });

        return SupplierImportTemplateMapper.toResponse(saved);
      });
    } catch (error) {
      this.handleUniqueViolation(error, dto.name ?? template.name);
    }
  }

  /**
   * Deletes a template within an atomic transaction with audit logging.
   */
  async delete(
    supplierId: string,
    templateId: string,
    actorId: string,
  ): Promise<void> {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, supplierId },
    });

    if (!template) {
      throw new NotFoundException({
        code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
        message: `La plantilla con ID ${templateId} no existe para este proveedor.`,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.DELETE,
        entityName: 'SupplierImportTemplate',
        entityId: template.id,
        previousValues: this.toAuditSnapshot(template),
        newValues: null,
      });

      const repo = manager.getRepository(SupplierImportTemplate);
      await repo.remove(template);
    });
  }

  /**
   * Converts a template entity to a clean snapshot for auditing.
   */
  private toAuditSnapshot(
    template: SupplierImportTemplate,
  ): Record<string, unknown> {
    return {
      id: template.id,
      supplierId: template.supplierId,
      name: template.name,
      headerFingerprint: template.headerFingerprint,
      mapping: template.mapping,
      headersSnapshot: template.headersSnapshot,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Translates PostgreSQL unique violations to domain ConflictExceptions.
   */
  private handleUniqueViolation(error: any, templateName?: string): never {
    if (error?.code === '23505') {
      const constraint =
        error.driverError?.constraint ?? error.constraint ?? '';

      if (constraint === 'uq_supplier_import_templates_supplier_fingerprint') {
        throw new ConflictException({
          code: ImporterErrorCode.IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE,
          message:
            'Ya existe una plantilla guardada para este formato de archivo en este proveedor.',
        });
      }

      if (constraint === 'uq_supplier_import_templates_supplier_name_upper') {
        throw new ConflictException({
          code: ImporterErrorCode.IMPORTER_TEMPLATE_NAME_DUPLICATE,
          message: `Ya existe una plantilla con el nombre "${templateName}" para este proveedor.`,
        });
      }
    }

    throw error;
  }
}

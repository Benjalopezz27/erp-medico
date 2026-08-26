import { SupplierImportTemplate } from '../entities/supplier-import-template.entity';
import { SupplierImportTemplateResponseDto } from '../dto/supplier-import-template-response.dto';
import { ISupplierImportTemplateSummary } from '@erp/shared-types';

export class SupplierImportTemplateMapper {
  static toResponse(
    entity: SupplierImportTemplate,
  ): SupplierImportTemplateResponseDto {
    return {
      id: entity.id,
      supplierId: entity.supplierId,
      name: entity.name,
      headerFingerprint: entity.headerFingerprint,
      headers: entity.headersSnapshot,
      mapping: entity.mapping,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt.toISOString()
          : entity.createdAt,
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt.toISOString()
          : entity.updatedAt,
    };
  }

  static toSummary(
    entity: SupplierImportTemplate,
  ): ISupplierImportTemplateSummary {
    return {
      id: entity.id,
      name: entity.name,
      headerFingerprint: entity.headerFingerprint,
      mapping: entity.mapping,
    };
  }
}

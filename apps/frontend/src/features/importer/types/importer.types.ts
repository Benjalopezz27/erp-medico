export type {
  IImporterSampleRow,
  IImporterSupplierSummary,
  IImporterUploadResponse,
  ISupplierImportMapping,
  ISupplierImportTemplate,
  ISupplierImportTemplateSummary,
  ICreateSupplierImportTemplatePayload,
  IUpdateSupplierImportTemplatePayload,
} from '@erp/shared-types';

export type ImporterStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'CONFIRM';

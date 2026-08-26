export type {
  IImporterSampleRow,
  IImporterSupplierSummary,
  IImporterUploadResponse,
  ISupplierImportMapping,
  ISupplierImportTemplate,
  ISupplierImportTemplateSummary,
  ICreateSupplierImportTemplatePayload,
  IUpdateSupplierImportTemplatePayload,
  IImporterRowError,
  IImporterValidRow,
  IImporterUnknownRow,
  IImporterErrorRow,
  IImporterPreviewSummary,
  IImporterPreviewResponse,
  IResolveUnknownSkuPayload,
  IImporterConfirmPayload,
  IImporterConfirmResponse,
  IImporterBatchItemSummary,
  IImporterBatchDetailResponse,
} from '@erp/shared-types';

export type ImporterStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'CONFIRM';

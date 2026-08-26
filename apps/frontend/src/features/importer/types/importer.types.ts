export type {
  IImporterSampleRow,
  IImporterSupplierSummary,
  IImporterUploadResponse,
} from '@erp/shared-types';

export type ImporterStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'CONFIRM';

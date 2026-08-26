export interface IImporterSupplierSummary {
  id: string;
  businessName: string;
  cuit: string;
}

export interface IImporterSampleRow {
  rowNumber: number;
  cells: Array<string | null>;
}

export interface ISupplierImportMapping {
  supplierSku: string;
  usualCostNet: string;
  supplierDescription?: string | null;
  rawQuantity?: string | null;
  purchaseUnit?: string | null;
}

export interface ISupplierImportTemplateSummary {
  id: string;
  name: string;
  headerFingerprint: string;
  mapping: ISupplierImportMapping;
}

export interface ISupplierImportTemplate {
  id: string;
  supplierId: string;
  name: string;
  headerFingerprint: string;
  headers: string[];
  mapping: ISupplierImportMapping;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateSupplierImportTemplatePayload {
  name: string;
  headerFingerprint: string;
  headers: string[];
  mapping: ISupplierImportMapping;
}

export interface IUpdateSupplierImportTemplatePayload {
  name?: string;
  mapping?: ISupplierImportMapping;
}

export interface IImporterUploadResponse {
  supplier: IImporterSupplierSummary;
  fileName: string;
  fileSize: number;
  clientMimeType: string;
  detectedFormat: 'csv' | 'xlsx';
  fileChecksum: string;
  headerFingerprint: string;
  headers: string[];
  normalizedHeaders: string[];
  totalRows: number;
  totalColumns: number;
  sampleRows: IImporterSampleRow[];
  detectedTemplate?: ISupplierImportTemplateSummary | null;
}

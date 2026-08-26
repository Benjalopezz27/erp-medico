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

// S3-US14-A Preview & Resolution Models
export type ImporterSemanticField =
  'supplierSku' | 'usualCostNet' | 'supplierDescription' | 'rawQuantity' | 'purchaseUnit' | 'row';

export interface IImporterRowError {
  rowNumber: number;
  field: ImporterSemanticField;
  code: import('../enums/importer.enum').ImporterRowErrorCode;
  message: string;
  rawValue?: string | number | boolean | null;
}

export interface IImporterProductReference {
  id: string;
  internalCode: string;
  name: string;
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export interface IImporterValidRow {
  rowNumber: number;
  rawSku: string;
  normalizedSku: string;
  supplierDescription?: string | null;
  usualCostNet: string; // Canonical 4-decimal string e.g. "1250.5000"
  rawQuantity?: string | null;
  quantityCanonical?: string | null;
  rawPurchaseUnit?: string | null;
  normalizedUnit?: string | null;
  supplierProduct: {
    id: string;
    isPrimarySupplier: boolean;
    purchaseUnit: {
      id: string;
      name: string;
      symbol: string;
    };
    conversionFactorToBase: string;
  };
  product: IImporterProductReference;
}

export interface IImporterUnknownRow {
  rowNumber: number;
  rawSku: string;
  normalizedSku: string;
  supplierDescription?: string | null;
  usualCostNet: string; // Canonical 4-decimal string e.g. "1250.5000"
  rawQuantity?: string | null;
  quantityCanonical?: string | null;
  rawPurchaseUnit?: string | null;
  normalizedUnit?: string | null;
}

export interface IImporterErrorRowAssociation {
  id: string;
  supplierExternalCode: string;
  purchaseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  conversionFactorToBase: string;
  product: IImporterProductReference;
}

export interface IImporterErrorRow {
  rowNumber: number;
  rawSku?: string | null;
  normalizedSku?: string | null;
  rawCost?: string | null;
  rawDescription?: string | null;
  rawQuantity?: string | null;
  rawPurchaseUnit?: string | null;
  association?: IImporterErrorRowAssociation | null;
  errors: IImporterRowError[];
}

export interface IImporterPreviewSummary {
  totalRows: number;
  validRows: number;
  unknownRows: number;
  errorRows: number;
  canContinue: boolean;
}

export interface IImporterPreviewResponse {
  supplier: IImporterSupplierSummary;
  fileChecksum: string;
  headerFingerprint: string;
  mappingChecksum: string;
  contentChecksum: string;
  summary: IImporterPreviewSummary;
  validRows: IImporterValidRow[];
  unknownRows: IImporterUnknownRow[];
  errorRows: IImporterErrorRow[];
}

export interface IResolveUnknownSkuPayload {
  supplierId: string;
  supplierSku: string;
  productId: string;
  purchaseUnitId: string;
  conversionFactorToBase: number | string;
  supplierDescription?: string | null;
  usualCostNet?: number | string | null;
}

export type ImporterCanonicalRowTuple = [
  number, // rowNumber
  'valid' | 'unknown' | 'error', // status
  string, // normalizedSku
  string | null, // costCanonical (e.g. '1250.5000')
  string | null, // quantityCanonical (e.g. '10.0000')
  string | null, // normalizedUnit (e.g. 'caja')
  string | null, // supplierProductId (UUID or null)
  string | null, // productId (UUID or null)
  string | null, // purchaseUnitId (UUID or null)
  string | null, // conversionFactor (e.g. '1.0000' or null)
  string[], // sortedErrorCodes (e.g. ['ROW_COST_NEGATIVE'])
];

export interface IImporterCanonicalContentPayload {
  version: 1;
  supplierId: string;
  fileChecksum: string;
  headerFingerprint: string;
  mappingChecksum: string;
  rows: ImporterCanonicalRowTuple[];
}

// S3-US14-B Confirmation Models
export interface IImporterConfirmPayload {
  supplierId: string;
  expectedFileChecksum: string;
  expectedMappingChecksum: string;
  expectedContentChecksum: string;
  mapping: ISupplierImportMapping;
  templateId?: string | null;
}

export interface IImporterConfirmResponse {
  batchId: string;
  supplier: IImporterSupplierSummary;
  fileName: string;
  fileChecksum: string;
  mappingChecksum: string;
  contentChecksum: string;
  totalRows: number;
  appliedRows: number;
  changedRows: number;
  unchangedRows: number;
  confirmedAt: string;
  templateId?: string | null;
}

export interface IImporterBatchItemSummary {
  id: string;
  rowNumber: number;
  supplierSku: string;
  productId: string;
  previousCostNet: string | null;
  newCostNet: string;
  costChanged: boolean;
  previousDescription: string | null;
  newDescription: string | null;
  descriptionChanged: boolean;
}

export interface IImporterBatchDetailResponse {
  batch: IImporterConfirmResponse;
  items: IImporterBatchItemSummary[];
}

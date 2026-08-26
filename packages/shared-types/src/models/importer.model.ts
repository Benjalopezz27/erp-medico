export interface IImporterSupplierSummary {
  id: string;
  businessName: string;
  cuit: string;
}

export interface IImporterSampleRow {
  rowNumber: number;
  cells: Array<string | null>;
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
}

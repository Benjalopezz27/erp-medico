import {
  ProductBulkLoadRowStatus,
  ProductBulkRowErrorCode,
  ProductImportBatchResult,
} from '../enums/product-bulk.enum';
import { ProductTaxTreatment } from '../enums/catalog.enum';

export interface IProductImportBatch {
  id: string;
  contentChecksum: string;
  fileChecksum: string;
  actorId: string;
  rowCount: number;
  movementCount: number;
  totalQuantityBase: string;
  result: ProductImportBatchResult;
  createdAt: Date;
}

export interface IProductBulkLoadRawRow {
  rowNumber: number;
  rawName: string;
  rawCategory?: string;
  rawBaseUnit?: string;
  rawCostNet?: string | number | null;
  rawActivePriceNet?: string | number | null;
  rawDescription?: string | null;
  rawMinStock?: string | number | null;
  rawInitialStock?: string | number | null;
  rawMarkupPercentage?: string | number | null;
  rawTaxTreatment?: string | null;
  rawIvaPercentage?: string | number | null;
  rawConversions?: string | null;
  hasFormula: boolean;
}

export interface IProductBulkConversionDto {
  presentationUnitId: string;
  presentationUnitName: string;
  presentationUnitSymbol: string;
  conversionFactor: number;
}

export interface IProductBulkLoadRowProduct {
  name: string;
  description: string | null;
  categoryName: string;
  categoryId: string;
  baseUnitName: string;
  baseUnitSymbol: string;
  baseUnitId: string;
  costNet: number;
  activePriceNet: number;
  minStock: number;
  initialStock: number;
  markupPercentage: number | null;
  suggestedPriceNet: number;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: number | null;
  conversions: IProductBulkConversionDto[];
}

export interface IProductBulkLoadRowError {
  code: ProductBulkRowErrorCode;
  field?: string;
  message: string;
}

export interface IProductBulkLoadValidatedRow {
  rowNumber: number;
  name: string;
  status: ProductBulkLoadRowStatus;
  product: IProductBulkLoadRowProduct | null;
  errors: IProductBulkLoadRowError[];
}

export interface IProductBulkLoadSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  totalInitialStock: number;
}

export interface IProductBulkLoadPreviewResponse {
  fileChecksum: string;
  contentChecksum: string | null;
  valid: boolean;
  summary: IProductBulkLoadSummary;
  rows: IProductBulkLoadValidatedRow[];
}

export interface IProductBulkLoadConfirmResponse {
  batchId: string;
  fileChecksum: string;
  contentChecksum: string;
  rowCount: number;
  movementCount: number;
  totalQuantityBase: number;
  confirmedAt: string;
}

export interface IProductBulkLoadTemplateQuery {
  format?: 'xlsx' | 'csv';
}

import type { ISortParams } from './sorting.model';
import {
  SaleStatus,
  FiscalDocumentType,
  ArcaStatus,
  PdfArtifactStatus,
  SaleReturnItemQuality,
} from '../enums/sales.enum';
import { AccountReceivableStatus, PaymentMethod } from '../enums/financial.enum';
import { CustomerPricingRuleApplied } from '../enums/customer-pricing.enum';
import { ProductTaxTreatment } from '../enums/catalog.enum';

export interface ISalePartySummary {
  id: string;
  name: string;
}

export interface ISaleCustomerSummary {
  id: string;
  businessName: string;
}

export interface ISaleProductSummary {
  id: string;
  internalCode: string;
  name: string;
}

export interface ISaleItem {
  id: string;
  saleId: string;
  productId: string;
  itemIndex: number;
  quantityBase: number;
  catalogPriceNet: string;
  pricingRuleApplied: CustomerPricingRuleApplied;
  pricingRuleId: string | null;
  discountPercentage: string | null;
  discountAmountNet: string;
  unitPriceNet: string;
  subtotalNet: string;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: string | null;
  ivaAmount: string;
  subtotalGross: string;
  product: ISaleProductSummary;
}

export interface IFiscalDocument {
  id: string;
  saleId: string;
  saleReturnId?: string | null;
  documentType: FiscalDocumentType | null;
  pointOfSale: number | null;
  documentNumber: number | null;
  cae?: string | null;
  caeExpirationDate?: string | null;
  arcaStatus: ArcaStatus;
  arcaErrorMessage?: string | null;
  qrCodeData?: string | null;
  issuedAt?: Date | string | null;
  pdfStatus: PdfArtifactStatus;
  qrAvailable: boolean;
  pdfGeneratedAt?: Date | string | null;
  pdfSizeBytes?: number | null;
}

export interface IFiscalDocumentPreviewReceiver {
  businessName: string;
  /** Código AFIP de tipo de documento receptor (80 CUIT, 96 DNI, 99 Consumidor Final). */
  documentType: number;
  documentNumber: string;
}

export interface IFiscalDocumentPreviewTotals {
  totalNet: string;
  taxableNet: string;
  exemptAmount: string;
  nonTaxedAmount: string;
  ivaTotal: string;
  totalGross: string;
}

export interface IFiscalDocumentPreview {
  saleId: string;
  /** true si el comprobante ya tiene CAE asignado (datos reales, no un cálculo). */
  isEmitted: boolean;
  invoiceType: FiscalDocumentType;
  pointOfSale: number | null;
  documentNumber: number | null;
  cae: string | null;
  receiver: IFiscalDocumentPreviewReceiver;
  items: ISaleItem[];
  totals: IFiscalDocumentPreviewTotals;
}

export interface IEmitFiscalDocumentResponse {
  fiscalDocumentId: string;
  arcaStatus: ArcaStatus;
  jobId: string;
  /** false cuando ya había un job en curso para este documento. */
  created: boolean;
}

export interface ISaleAccountReceivable {
  id: string;
  customerId: string;
  saleId: string;
  fiscalDocumentId: string;
  documentReference: string;
  originalAmount: string;
  currentBalance: string;
  status: AccountReceivableStatus;
  dueDate: Date | string | null;
}

export interface ISale {
  id: string;
  saleNumber: string;
  customerId: string | null;
  status: SaleStatus;
  isCreditSale: boolean;
  requiresFiscalInvoice: boolean;
  paymentMethod: PaymentMethod;
  totalNet: string;
  taxableNet: string;
  exemptAmount: string;
  nonTaxedAmount: string;
  ivaTotal: string;
  totalGross: string;
  customer: ISaleCustomerSummary | null;
  user: ISalePartySummary;
  items: ISaleItem[];
  fiscalDocument: IFiscalDocument | null;
  accountReceivable: ISaleAccountReceivable | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateSaleItemPayload {
  productId: string;
  quantityBase: number;
}

export interface ICreateSalePayload {
  customerId?: string | null;
  isCreditSale: boolean;
  requiresFiscalInvoice: boolean;
  paymentMethod: PaymentMethod;
  items: ICreateSaleItemPayload[];
  /** Reenviar la misma clave en reintentos evita duplicar la venta. */
  idempotencyKey?: string;
}

export interface ISaleSearchParams extends ISortParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  customerId?: string;
  status?: SaleStatus;
}

export interface ISalesPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedSalesResponse {
  data: ISale[];
  meta: ISalesPaginationMeta;
}

export interface ISaleReturnItem {
  id: string;
  saleReturnId: string;
  saleItemId: string;
  productId: string;
  quantityBase: number;
  quality: SaleReturnItemQuality;
  unitPriceNet: string;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: string | null;
  subtotalNet: string;
  ivaAmount: string;
  subtotalGross: string;
  stockMovementId?: string | null;
  quarantineStockId?: string | null;
  notes?: string | null;
  product?: ISaleProductSummary;
  createdAt: Date | string;
}

export interface ISaleReturn {
  id: string;
  saleId: string;
  userId: string;
  reason: string;
  taxableNet: string;
  exemptAmount: string;
  nonTaxedAmount: string;
  totalNet: string;
  ivaTotal: string;
  totalGross: string;
  idempotencyKey?: string | null;
  fiscalDocument?: IFiscalDocument | null;
  user?: ISalePartySummary;
  items: ISaleReturnItem[];
  createdAt: Date | string;
}

export interface ICreateSaleReturnItemPayload {
  saleItemId: string;
  quantityBase: number | string;
  quality: SaleReturnItemQuality;
  notes?: string | null;
}

export interface ICreateSaleReturnPayload {
  reason: string;
  idempotencyKey?: string | null;
  items: ICreateSaleReturnItemPayload[];
}

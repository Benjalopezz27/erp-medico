import { SaleStatus, FiscalDocumentType, ArcaStatus } from '../enums/sales.enum';
import { PaymentMethod } from '../enums/financial.enum';
import { CustomerPricingRuleApplied } from '../enums/customer-pricing.enum';

export interface ISaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantityBase: number;
  catalogPriceNet: string;
  pricingRuleApplied: CustomerPricingRuleApplied;
  pricingRuleId: string | null;
  discountPercentage: string | null;
  discountAmountNet: string;
  unitPriceNet: string;
  subtotalNet: string;
  ivaPercentage: string;
  ivaAmount: string;
  subtotalGross: string;
}

export interface IFiscalDocument {
  id: string;
  saleId: string;
  documentType: FiscalDocumentType | null;
  pointOfSale: number | null;
  documentNumber: number | null;
  cae?: string | null;
  caeExpirationDate?: string | null;
  arcaStatus: ArcaStatus;
  arcaErrorMessage?: string | null;
  qrCodeData?: string | null;
  issuedAt?: Date | string | null;
}

export interface ISale {
  id: string;
  saleNumber: string;
  customerId?: string | null;
  status: SaleStatus;
  isCreditSale: boolean;
  requiresFiscalInvoice: boolean;
  paymentMethod: PaymentMethod;
  totalNet: string;
  ivaTotal: string;
  totalGross: string;
  items?: ISaleItem[];
  fiscalDocument?: IFiscalDocument | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

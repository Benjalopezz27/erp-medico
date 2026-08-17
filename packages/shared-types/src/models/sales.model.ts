import { SaleStatus, FiscalDocumentType, ArcaStatus } from '../enums/sales.enum';
import { PaymentMethod } from '../enums/financial.enum';

export interface ISaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantityBase: number;
  unitPriceNet: number;
  subtotalNet: number;
  ivaPercentage: number;
  ivaAmount: number;
  subtotalGross: number;
}

export interface IFiscalDocument {
  id: string;
  saleId: string;
  documentType: FiscalDocumentType;
  pointOfSale: number;
  documentNumber: number;
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
  totalNet: number;
  ivaTotal: number;
  totalGross: number;
  items?: ISaleItem[];
  fiscalDocument?: IFiscalDocument | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

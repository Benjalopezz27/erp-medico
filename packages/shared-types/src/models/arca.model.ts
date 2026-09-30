import { FiscalDocumentType } from '../enums/sales.enum';

export interface ArcaAuthTicket {
  token: string;
  sign: string;
  expirationTime: string;
}

export interface FiscalAmounts {
  taxableNetAmount: number;
  exemptAmount: number;
  nonTaxedAmount: number;
  ivaAmount: number;
  totalAmount: number;
  ivaBreakdown: FiscalIvaBreakdown[];
}

export interface FiscalDocumentData extends FiscalAmounts {
  documentType: FiscalDocumentType;
  pointOfSale: number;
  documentNumber: number;
  concept?: number; // 1: Products, 2: Services, 3: Products & Services
  docType?: number; // 80: CUIT, 96: DNI, 99: Final Consumer
  docNumber?: string;
  receiverIvaConditionId?: number; // FEParamGetCondicionIvaReceptor: 1 RI, 4 Exento, 5 CF, 6 Monotributo
  documentDate?: string; // YYYYMMDD
  /** Required by WSFE for Notas de Crédito/Débito: the invoice being credited/debited. */
  associatedDocument?: {
    documentType: FiscalDocumentType;
    pointOfSale: number;
    documentNumber: number;
  };
}

export interface FiscalIvaBreakdown {
  arcaRateId: 3 | 4 | 5 | 6 | 8 | 9;
  percentage: number;
  taxableBase: number;
  amount: number;
}

export interface ArcaCaeResponse {
  cae: string;
  caeExpiration: string;
}

export interface ArcaFiscalDocument {
  documentType: number;
  pointOfSale: number;
  documentNumber: number;
  cae?: string;
  caeExpiration?: string;
}

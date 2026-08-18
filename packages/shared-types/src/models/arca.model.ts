import { FiscalDocumentType } from '../enums/sales.enum';

export interface ArcaAuthTicket {
  token: string;
  sign: string;
  expirationTime: string;
}

export interface FiscalDocumentData {
  documentType: FiscalDocumentType;
  pointOfSale: number;
  documentNumber: number;
  concept?: number; // 1: Products, 2: Services, 3: Products & Services
  docType?: number; // 80: CUIT, 96: DNI, 99: Final Consumer
  docNumber?: string;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
  documentDate?: string; // YYYYMMDD
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

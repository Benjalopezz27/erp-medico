import {
  ArcaAuthTicket,
  FiscalDocumentData,
  ArcaCaeResponse,
  ArcaFiscalDocument,
} from '@erp/shared-types';

export interface IArcaService {
  login(): Promise<ArcaAuthTicket>;
  requestCAE(data: FiscalDocumentData): Promise<ArcaCaeResponse>;
  queryDocument(
    type: number,
    pointOfSale: number,
    documentNumber: number,
  ): Promise<ArcaFiscalDocument | null>;
}

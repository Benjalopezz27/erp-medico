import {
  ArcaAuthTicket,
  FiscalDocumentData,
  FiscalDocumentType,
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
  /**
   * Last comprobante number ARCA has authorized for this document type and
   * point of sale (WSFE `FECompUltimoAutorizado`). Callers reserve
   * `result + 1` as the next number before requesting a CAE.
   */
  getLastAuthorizedNumber(
    documentType: FiscalDocumentType,
    pointOfSale: number,
  ): Promise<number>;
}

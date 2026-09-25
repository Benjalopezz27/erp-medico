import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalDocumentType } from '@erp/shared-types';
import { CBTE_TIPO_BY_DOCUMENT_TYPE } from '../../arca/services/wsfe-soap-client.service';
import { FiscalDocument } from '../entities/fiscal-document.entity';

export interface FiscalQrReceiver {
  /** AFIP `tipoDocRec` code: 80 (CUIT), 96 (DNI) or 99 (Consumidor Final / sin dato). */
  docType: number;
  docNumber: string;
}

export interface FiscalQrPayload {
  ver: 1;
  fecha: string;
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: 'PES';
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: 'E';
  codAut: number;
}

const QR_BASE_URL = 'https://www.afip.gob.ar/fe/qr/';

/**
 * Fixed key order (AFIP RG 4291/2018) — building the JSON from this array
 * instead of `Object.keys(payload)` is what makes the payload byte-for-byte
 * reproducible for the same comprobante, required for QR/PDF checksum
 * stability across regenerations.
 */
const PAYLOAD_KEYS: (keyof FiscalQrPayload)[] = [
  'ver',
  'fecha',
  'cuit',
  'ptoVta',
  'tipoCmp',
  'nroCmp',
  'importe',
  'moneda',
  'ctz',
  'tipoDocRec',
  'nroDocRec',
  'tipoCodAut',
  'codAut',
];

/**
 * Builds the official AFIP QR payload for an already-authorized
 * FiscalDocument. Only reads persisted, authoritative fields — never
 * recalculates from current prices/master data.
 */
@Injectable()
export class FiscalQrPayloadService {
  constructor(private readonly configService: ConfigService) {}

  build(
    document: FiscalDocument,
    totalAmount: number,
    receiver: FiscalQrReceiver,
  ): { payload: FiscalQrPayload; url: string } {
    if (
      !document.documentType ||
      !document.pointOfSale ||
      !document.documentNumber ||
      !document.cae ||
      !document.issuedAt
    ) {
      throw new Error(
        '[FiscalQrPayloadService] El comprobante no tiene datos fiscales completos (CAE/número/fecha) para generar el QR.',
      );
    }

    const cuit = Number(this.configService.get<string>('ARCA_CUIT'));

    const payload: FiscalQrPayload = {
      ver: 1,
      fecha: this.formatDate(document.issuedAt),
      cuit,
      ptoVta: document.pointOfSale,
      tipoCmp: CBTE_TIPO_BY_DOCUMENT_TYPE[document.documentType as FiscalDocumentType],
      nroCmp: document.documentNumber,
      importe: totalAmount,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: receiver.docType,
      nroDocRec: Number(receiver.docNumber) || 0,
      tipoCodAut: 'E',
      codAut: Number(document.cae),
    };

    const url = `${QR_BASE_URL}?p=${Buffer.from(this.toCanonicalJson(payload), 'utf8').toString('base64')}`;

    return { payload, url };
  }

  private toCanonicalJson(payload: FiscalQrPayload): string {
    const canonical: Record<string, unknown> = {};
    for (const key of PAYLOAD_KEYS) {
      canonical[key] = payload[key];
    }
    return JSON.stringify(canonical);
  }

  private formatDate(issuedAt: Date): string {
    return issuedAt.toISOString().slice(0, 10);
  }
}

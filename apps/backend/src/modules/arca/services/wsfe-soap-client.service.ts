import * as https from 'https';
import * as http from 'http';
import {
  ArcaAuthTicket,
  ArcaCaeResponse,
  ArcaFiscalDocument,
  FiscalDocumentData,
  FiscalDocumentType,
} from '@erp/shared-types';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';

/** AFIP WSFE `CbteTipo` codes for the document types this ERP issues. */
export const CBTE_TIPO_BY_DOCUMENT_TYPE: Record<FiscalDocumentType, number> = {
  [FiscalDocumentType.FACTURA_A]: 1,
  [FiscalDocumentType.NOTA_DEBITO_A]: 2,
  [FiscalDocumentType.NOTA_CREDITO_A]: 3,
  [FiscalDocumentType.FACTURA_B]: 6,
  [FiscalDocumentType.NOTA_DEBITO_B]: 7,
  [FiscalDocumentType.NOTA_CREDITO_B]: 8,
  [FiscalDocumentType.REMITO]: 91,
};

export class WsfeRejectedError extends Error {
  constructor(
    message: string,
    public readonly observations: string,
  ) {
    super(message);
    this.name = 'WsfeRejectedError';
  }
}

/**
 * Raw WSFE (Web Service Facturación Electrónica) SOAP transport.
 * Mirrors the WSAA pattern in ArcaHomologationService: XML templates + the
 * native `https`/`http` module, no SOAP library, responses parsed with
 * targeted regexes rather than a generic XML parser.
 */
export class WsfeSoapClientService {
  constructor(private readonly wsfeUrl: string) {}

  async getLastAuthorized(
    auth: ArcaAuthTicket,
    cuit: string,
    pointOfSale: number,
    cbteTipo: number,
  ): Promise<number> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${pointOfSale}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

    const body = await this.post(
      envelope,
      'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    );
    const normalized = this.normalize(body);
    this.throwOnFault(normalized);

    const match = normalized.match(/<CbteNro>([\s\S]*?)<\/CbteNro>/);
    if (!match) {
      throw new Error(
        'WSFE FECompUltimoAutorizado: no se pudo extraer CbteNro de la respuesta.',
      );
    }
    return parseInt(match[1].trim(), 10);
  }

  async requestCae(
    auth: ArcaAuthTicket,
    cuit: string,
    cbteTipo: number,
    data: FiscalDocumentData,
  ): Promise<ArcaCaeResponse> {
    const ivaItems = data.ivaBreakdown
      .map(
        (item) => `<ar:AlicIva>
            <ar:Id>${item.arcaRateId}</ar:Id>
            <ar:BaseImp>${item.taxableBase.toFixed(2)}</ar:BaseImp>
            <ar:Importe>${item.amount.toFixed(2)}</ar:Importe>
          </ar:AlicIva>`,
      )
      .join('\n          ');

    const documentDate = data.documentDate ?? this.formatDate(new Date());

    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${data.pointOfSale}</ar:PtoVta>
          <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${data.concept ?? 1}</ar:Concepto>
            <ar:DocTipo>${data.docType ?? 99}</ar:DocTipo>
            <ar:DocNro>${data.docNumber ?? 0}</ar:DocNro>
            <ar:CbteDesde>${data.documentNumber}</ar:CbteDesde>
            <ar:CbteHasta>${data.documentNumber}</ar:CbteHasta>
            <ar:CbteFch>${documentDate}</ar:CbteFch>
            <ar:ImpTotal>${data.totalAmount.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>${data.nonTaxedAmount.toFixed(2)}</ar:ImpTotConc>
            <ar:ImpNeto>${data.taxableNetAmount.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>${data.exemptAmount.toFixed(2)}</ar:ImpOpEx>
            <ar:ImpIVA>${data.ivaAmount.toFixed(2)}</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:Iva>
          ${ivaItems}
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

    const body = await this.post(
      envelope,
      'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
    );
    const normalized = this.normalize(body);
    this.throwOnFault(normalized);

    const resultadoMatch = normalized.match(
      /<Resultado>([\s\S]*?)<\/Resultado>/,
    );
    const observations = this.extractObservations(normalized);

    if (!resultadoMatch || resultadoMatch[1].trim() !== 'A') {
      throw new WsfeRejectedError(
        `WSFE rechazó el comprobante (Resultado: ${resultadoMatch?.[1]?.trim() ?? 'desconocido'}).`,
        observations,
      );
    }

    const caeMatch = normalized.match(/<CAE>([\s\S]*?)<\/CAE>/);
    const caeVtoMatch = normalized.match(/<CAEFchVto>([\s\S]*?)<\/CAEFchVto>/);
    if (!caeMatch || !caeVtoMatch) {
      throw new Error(
        'WSFE FECAESolicitar: no se pudo extraer CAE o CAEFchVto de una respuesta aprobada.',
      );
    }

    return {
      cae: caeMatch[1].trim(),
      caeExpiration: caeVtoMatch[1].trim(),
    };
  }

  async queryDocument(
    auth: ArcaAuthTicket,
    cuit: string,
    cbteTipo: number,
    pointOfSale: number,
    documentNumber: number,
  ): Promise<ArcaFiscalDocument | null> {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompConsultar>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCompConsReq>
        <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        <ar:CbteNro>${documentNumber}</ar:CbteNro>
        <ar:PtoVta>${pointOfSale}</ar:PtoVta>
      </ar:FeCompConsReq>
    </ar:FECompConsultar>
  </soapenv:Body>
</soapenv:Envelope>`;

    const body = await this.post(
      envelope,
      'http://ar.gov.afip.dif.FEV1/FECompConsultar',
    );
    const normalized = this.normalize(body);
    this.throwOnFault(normalized);

    const caeMatch = normalized.match(
      /<CodAutorizacion>([\s\S]*?)<\/CodAutorizacion>/,
    );
    if (!caeMatch) {
      return null;
    }
    const caeVtoMatch = normalized.match(/<FchVto>([\s\S]*?)<\/FchVto>/);

    return {
      documentType: cbteTipo,
      pointOfSale,
      documentNumber,
      cae: caeMatch[1].trim(),
      caeExpiration: caeVtoMatch?.[1]?.trim(),
    };
  }

  private extractObservations(normalized: string): string {
    const messages = [...normalized.matchAll(/<Msg>([\s\S]*?)<\/Msg>/g)].map(
      (m) => m[1].trim(),
    );
    return messages.join('; ');
  }

  private throwOnFault(normalized: string): void {
    const faultMatch = normalized.match(
      /<faultstring>([\s\S]*?)<\/faultstring>/,
    );
    if (faultMatch) {
      throw new Error(`AFIP WSFE Fault: ${faultMatch[1]}`);
    }
  }

  private normalize(soapXml: string): string {
    return soapXml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  private post(envelope: string, soapAction: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.wsfeUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        this.wsfeUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: soapAction,
            'Content-Length': Buffer.byteLength(envelope),
          },
          timeout: 10000,
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => (responseBody += chunk));
          res.on('end', () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(responseBody);
            } else {
              const sanitizedError = redactSecrets(responseBody);
              reject(
                new Error(
                  `WSFE ${soapAction} returned HTTP ${res.statusCode}: ${sanitizedError}`,
                ),
              );
            }
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`WSFE ${soapAction} request timed out after 10000ms`));
      });

      req.on('error', (err) => {
        const sanitized = redactSecrets(err.message);
        reject(new Error(`WSFE network error: ${sanitized}`));
      });

      req.write(envelope);
      req.end();
    });
  }
}

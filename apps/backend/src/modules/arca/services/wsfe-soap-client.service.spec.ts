import { EventEmitter } from 'events';
import * as https from 'https';
import {
  WsfeSoapClientService,
  WsfeRejectedError,
} from './wsfe-soap-client.service';
import { FiscalDocumentType, FiscalDocumentData } from '@erp/shared-types';

jest.mock('https');

const mockedHttps = https as jest.Mocked<typeof https>;

interface MockResponse extends EventEmitter {
  statusCode?: number;
}

function mockSoapResponse(statusCode: number, body: string): void {
  (mockedHttps.request as unknown as jest.Mock).mockImplementation(
    (
      _url: unknown,
      _options: unknown,
      callback: (res: MockResponse) => void,
    ) => {
      const res: MockResponse = new EventEmitter();
      res.statusCode = statusCode;
      const req = new EventEmitter() as any;
      req.write = jest.fn();
      req.end = jest.fn(() => {
        callback(res);
        res.emit('data', Buffer.from(body));
        res.emit('end');
      });
      req.destroy = jest.fn();
      return req;
    },
  );
}

function mockNetworkError(message: string): void {
  (mockedHttps.request as unknown as jest.Mock).mockImplementation(() => {
    const req = new EventEmitter() as any;
    req.write = jest.fn();
    req.end = jest.fn(() => {
      req.emit('error', new Error(message));
    });
    req.destroy = jest.fn();
    return req;
  });
}

const auth = { token: 'tok', sign: 'sig', expirationTime: '2026-01-01' };

const baseData: FiscalDocumentData = {
  documentType: FiscalDocumentType.FACTURA_B,
  pointOfSale: 1,
  documentNumber: 42,
  taxableNetAmount: 100,
  exemptAmount: 0,
  nonTaxedAmount: 0,
  ivaAmount: 21,
  totalAmount: 121,
  ivaBreakdown: [
    { arcaRateId: 5, percentage: 21, taxableBase: 100, amount: 21 },
  ],
};

describe('WsfeSoapClientService', () => {
  let client: WsfeSoapClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new WsfeSoapClientService(
      'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    );
  });

  describe('getLastAuthorized', () => {
    it('parses CbteNro from a successful response', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECompUltimoAutorizadoResponse><FECompUltimoAutorizadoResult><CbteNro>15</CbteNro></FECompUltimoAutorizadoResult></FECompUltimoAutorizadoResponse></Body></Envelope>',
      );
      const result = await client.getLastAuthorized(auth, '20123456789', 1, 6);
      expect(result).toBe(15);
    });

    it('throws on a SOAP fault', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><Fault><faultstring>Invalid token</faultstring></Fault></Body></Envelope>',
      );
      await expect(
        client.getLastAuthorized(auth, '20123456789', 1, 6),
      ).rejects.toThrow(/AFIP WSFE Fault: Invalid token/);
    });

    it('throws when the response is missing CbteNro', async () => {
      mockSoapResponse(200, '<Envelope><Body></Body></Envelope>');
      await expect(
        client.getLastAuthorized(auth, '20123456789', 1, 6),
      ).rejects.toThrow(/no se pudo extraer CbteNro/);
    });
  });

  describe('secret sanitization', () => {
    it('never leaks Token/Sign in an HTTP error message', async () => {
      mockSoapResponse(
        500,
        '<Envelope><Body><Token>super-secret-token</Token><Sign>super-secret-sign</Sign></Body></Envelope>',
      );
      let caught: Error | undefined;
      try {
        await client.getLastAuthorized(auth, '20123456789', 1, 6);
      } catch (error) {
        caught = error as Error;
      }
      expect(caught).toBeDefined();
      expect(caught!.message).not.toContain('super-secret-token');
      expect(caught!.message).not.toContain('super-secret-sign');
    });
  });

  describe('requestCae', () => {
    it('returns CAE and expiration on approval (Resultado=A)', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECAESolicitarResponse><FECAESolicitarResult><FeDetResp><FECAEDetResponse><Resultado>A</Resultado><CAE>70123456789012</CAE><CAEFchVto>20260201</CAEFchVto></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse></Body></Envelope>',
      );
      const result = await client.requestCae(auth, '20123456789', 6, baseData);
      expect(result).toEqual({
        cae: '70123456789012',
        caeExpiration: '20260201',
      });
    });

    it('throws WsfeRejectedError on rejection (Resultado=R)', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECAESolicitarResponse><FECAESolicitarResult><FeDetResp><FECAEDetResponse><Resultado>R</Resultado><Observaciones><Obs><Code>10</Code><Msg>CUIT no autorizado</Msg></Obs></Observaciones></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse></Body></Envelope>',
      );
      await expect(
        client.requestCae(auth, '20123456789', 6, baseData),
      ).rejects.toThrow(WsfeRejectedError);
    });

    it('throws when the response is an incomplete approval (missing CAE)', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECAESolicitarResponse><FECAESolicitarResult><FeDetResp><FECAEDetResponse><Resultado>A</Resultado></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse></Body></Envelope>',
      );
      await expect(
        client.requestCae(auth, '20123456789', 6, baseData),
      ).rejects.toThrow(/no se pudo extraer CAE/);
    });

    it('sanitizes network errors', async () => {
      mockNetworkError('ECONNRESET token=secret-value sign=other-secret');
      await expect(
        client.requestCae(auth, '20123456789', 6, baseData),
      ).rejects.toThrow(/WSFE network error/);
    });
  });

  describe('queryDocument', () => {
    it('returns null when ARCA has no record of the document', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECompConsultarResponse><FECompConsultarResult><ResultGet></ResultGet></FECompConsultarResult></FECompConsultarResponse></Body></Envelope>',
      );
      const result = await client.queryDocument(auth, '20123456789', 6, 1, 42);
      expect(result).toBeNull();
    });

    it('maps the document when ARCA has a record', async () => {
      mockSoapResponse(
        200,
        '<Envelope><Body><FECompConsultarResponse><FECompConsultarResult><ResultGet><CodAutorizacion>70123456789012</CodAutorizacion><FchVto>20260201</FchVto></ResultGet></FECompConsultarResult></FECompConsultarResponse></Body></Envelope>',
      );
      const result = await client.queryDocument(auth, '20123456789', 6, 1, 42);
      expect(result).toEqual({
        documentType: 6,
        pointOfSale: 1,
        documentNumber: 42,
        cae: '70123456789012',
        caeExpiration: '20260201',
      });
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { ArcaStatus, FiscalDocumentType } from '@erp/shared-types';
import { FiscalQrPayloadService } from './fiscal-qr-payload.service';
import { FiscalDocument } from '../entities/fiscal-document.entity';

describe('FiscalQrPayloadService', () => {
  function makeService() {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'ARCA_CUIT' ? '20345678901' : undefined,
      ),
    } as unknown as ConfigService;
    return new FiscalQrPayloadService(configService);
  }

  function makeDocument(
    overrides: Partial<FiscalDocument> = {},
  ): FiscalDocument {
    return {
      id: 'doc-1',
      saleId: 'sale-1',
      saleReturnId: null,
      documentType: FiscalDocumentType.FACTURA_B,
      pointOfSale: 3,
      documentNumber: 102,
      cae: '73000012345678',
      caeExpirationDate: '2026-09-03',
      arcaStatus: ArcaStatus.EMITIDO,
      arcaErrorMessage: null,
      qrCodeData: null,
      issuedAt: new Date('2026-08-24T15:00:00.000Z'),
      ...overrides,
    } as FiscalDocument;
  }

  it('builds the 13-field AFIP payload for a Factura B with CUIT receiver', () => {
    const service = makeService();
    const { payload, url } = service.build(makeDocument(), 15000.5, {
      docType: 80,
      docNumber: '20123456789',
    });

    expect(payload).toEqual({
      ver: 1,
      fecha: '2026-08-24',
      cuit: 20345678901,
      ptoVta: 3,
      tipoCmp: 6,
      nroCmp: 102,
      importe: 15000.5,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 80,
      nroDocRec: 20123456789,
      tipoCodAut: 'E',
      codAut: 73000012345678,
    });
    expect(url.startsWith('https://www.afip.gob.ar/fe/qr/?p=')).toBe(true);
  });

  it('maps Factura A / Nota de Crédito A/B document types to their WSFE tipoCmp', () => {
    const service = makeService();
    const cases: [FiscalDocumentType, number][] = [
      [FiscalDocumentType.FACTURA_A, 1],
      [FiscalDocumentType.NOTA_CREDITO_A, 3],
      [FiscalDocumentType.FACTURA_B, 6],
      [FiscalDocumentType.NOTA_CREDITO_B, 8],
    ];
    for (const [documentType, tipoCmp] of cases) {
      const { payload } = service.build(makeDocument({ documentType }), 100, {
        docType: 99,
        docNumber: '0',
      });
      expect(payload.tipoCmp).toBe(tipoCmp);
    }
  });

  it('defaults Consumidor Final (no CUIT/DNI) to tipoDocRec 99 and nroDocRec 0', () => {
    const service = makeService();
    const { payload } = service.build(makeDocument(), 100, {
      docType: 99,
      docNumber: '0',
    });
    expect(payload.tipoDocRec).toBe(99);
    expect(payload.nroDocRec).toBe(0);
  });

  it('produces the exact same payload and URL across repeated calls (determinism)', () => {
    const service = makeService();
    const document = makeDocument();
    const first = service.build(document, 15000.5, {
      docType: 80,
      docNumber: '20123456789',
    });
    const second = service.build(document, 15000.5, {
      docType: 80,
      docNumber: '20123456789',
    });
    expect(second).toEqual(first);
  });

  it('the URL payload decodes back to the exact 13-field object', () => {
    const service = makeService();
    const { payload, url } = service.build(makeDocument(), 15000.5, {
      docType: 80,
      docNumber: '20123456789',
    });
    const encoded = url.split('?p=')[1];
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    expect(decoded).toEqual(payload);
    expect(Object.keys(decoded)).toEqual([
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
    ]);
  });

  it('throws if the document is missing CAE/number/issuedAt', () => {
    const service = makeService();
    expect(() =>
      service.build(makeDocument({ cae: null }), 100, {
        docType: 99,
        docNumber: '0',
      }),
    ).toThrow(/datos fiscales completos/);
  });
});

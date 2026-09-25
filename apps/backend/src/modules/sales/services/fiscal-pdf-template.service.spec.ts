import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import {
  FiscalPdfInput,
  FiscalPdfTemplateService,
} from './fiscal-pdf-template.service';

describe('FiscalPdfTemplateService', () => {
  let service: FiscalPdfTemplateService;
  let qrPngBytes: Uint8Array;

  beforeAll(async () => {
    service = new FiscalPdfTemplateService();
    qrPngBytes = await QRCode.toBuffer('https://www.afip.gob.ar/fe/qr/?p=test');
  });

  function baseInput(overrides: Partial<FiscalPdfInput> = {}): FiscalPdfInput {
    return {
      emisor: {
        razonSocial: 'ERP Distribuidora Médica SRL',
        documentLabel: 'CUIT 20345678901',
        taxConditionLabel: 'Responsable Inscripto',
      },
      receptor: {
        razonSocial: 'Juan Pérez',
        documentLabel: 'DNI 20123456',
        taxConditionLabel: 'Consumidor Final',
      },
      documentTypeLabel: 'Factura B',
      pointOfSale: 3,
      documentNumber: 102,
      issuedAt: new Date('2026-08-24T15:00:00.000Z'),
      items: [
        {
          productCode: 'SKU-1',
          productName: 'Jeringa 5ml',
          quantity: 10,
          unitPriceNet: 50,
          ivaPercentage: 21,
          subtotalGross: 605,
        },
      ],
      taxableNetAmount: 500,
      exemptAmount: 0,
      nonTaxedAmount: 0,
      ivaAmount: 105,
      totalAmount: 605,
      cae: '73000012345678',
      caeExpirationDate: '2026-09-03',
      qrPngBytes,
      ...overrides,
    };
  }

  it('produces a buffer starting with the %PDF signature', async () => {
    const bytes = await service.render(baseInput());
    const header = Buffer.from(bytes.slice(0, 5)).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('handles special characters (accents/ñ) without throwing', async () => {
    const bytes = await service.render(
      baseInput({
        receptor: {
          razonSocial: 'Ñandú Compañía S.A. — Peña 123',
          documentLabel: 'CUIT 20987654321',
          taxConditionLabel: 'Responsable Inscripto',
        },
      }),
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
  });

  it('renders multiple pages when there are many line items', async () => {
    const manyItems = Array.from({ length: 80 }, (_, i) => ({
      productCode: `SKU-${i}`,
      productName: `Producto ${i}`,
      quantity: 1,
      unitPriceNet: 10,
      ivaPercentage: 21,
      subtotalGross: 12.1,
    }));
    const bytes = await service.render(
      baseInput({ items: manyItems, taxableNetAmount: 800, ivaAmount: 168, totalAmount: 968 }),
    );
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it('renders without optional fields (no items, zero amounts)', async () => {
    const bytes = await service.render(
      baseInput({
        items: [],
        taxableNetAmount: 0,
        exemptAmount: 0,
        nonTaxedAmount: 0,
        ivaAmount: 0,
        totalAmount: 0,
      }),
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString('ascii')).toBe('%PDF-');
  });

  it('produces a stable SHA-256 checksum for the same input across renders', async () => {
    const input = baseInput();
    const first = await service.render(input);
    const second = await service.render(input);
    const hash = (b: Uint8Array) =>
      crypto.createHash('sha256').update(b).digest('hex');
    expect(hash(second)).toEqual(hash(first));
  });
});

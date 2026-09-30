import { PDFDocument } from 'pdf-lib';
import { PaymentMethod, PaymentStatus } from '@erp/shared-types';
import { ReceiptPdfService, paymentMethodLabel } from './receipt-pdf.service';

describe('ReceiptPdfService', () => {
  const service = new ReceiptPdfService();
  const emisor = {
    razonSocial: 'Distribuidora Médica S.A.',
    cuit: '30123456789',
  };
  const receipt = (n: number) => ({
    id: 'r-1',
    receiptNumber: '0001-00000001',
    paymentId: 'p-1',
    createdAt: '2026-08-14T15:00:00.000Z',
    customerId: 'c-1',
    customerName: 'Farmacia del Sud – ñandú',
    customerDocument: '20987654321',
    paymentMethod: PaymentMethod.EFECTIVO,
    paymentStatus: PaymentStatus.REGISTRADO,
    check: null,
    notes: null,
    totalAmount: '1250.50',
    applied: Array.from({ length: n }, (_, i) => ({
      accountReceivableId: `ar-${i}`,
      documentReference: `V-${String(i).padStart(8, '0')}`,
      invoiceDate: '2026-06-10T15:00:00.000Z',
      originalAmount: '150.00',
      amountApplied: '100.00',
    })),
  });

  it('renders an A4 PDF that starts with %PDF', async () => {
    const bytes = await service.render({ receipt: receipt(2), emisor });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe('%PDF');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it('paginates a receipt with many invoices', async () => {
    const bytes = await service.render({ receipt: receipt(80), emisor });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });

  it('labels a check payment with bank and number', () => {
    expect(
      paymentMethodLabel({
        paymentMethod: PaymentMethod.CHEQUE,
        check: { bankName: 'Galicia', checkNumber: '12345678' },
      }),
    ).toBe('Cheque (Banco Galicia, N° 12345678)');
    expect(paymentMethodLabel(receipt(1))).toBe('Efectivo');
  });

  it('renders a reverted receipt as a valid PDF', async () => {
    const bytes = await service.render({
      receipt: {
        ...receipt(1),
        paymentMethod: PaymentMethod.CHEQUE,
        paymentStatus: PaymentStatus.REVERTIDO,
        check: { bankName: 'Galicia', checkNumber: '12345678' },
      },
      emisor,
    });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe('%PDF');
  });
});

import { BadRequestException } from '@nestjs/common';
import { normalizeSupplierInvoiceNumber } from './supplier-invoice-number-normalizer';

describe('normalizeSupplierInvoiceNumber', () => {
  it('normalizes unicode, casing, whitespace and separators deterministically', () => {
    expect(normalizeSupplierInvoiceNumber('  ａ  0001 - 00001234 ')).toBe(
      'A 0001-00001234',
    );
    expect(normalizeSupplierInvoiceNumber('A 0001 / 00001234')).toBe(
      'A 0001/00001234',
    );
    expect(normalizeSupplierInvoiceNumber('Factura Nº 1')).toBe('FACTURA NO 1');
  });

  it.each(['', 'A\u0000-1', 'Factura @ 1', 'x'.repeat(51)])(
    'rejects invalid value %p',
    (value) => {
      expect(() => normalizeSupplierInvoiceNumber(value)).toThrow(
        BadRequestException,
      );
    },
  );
});

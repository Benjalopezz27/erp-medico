import { describe, expect, it } from 'vitest';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceQuantityStatus,
} from '../types/supplier-invoices.types';
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  formatDecimalAr,
} from './supplier-invoices.math';

describe('supplier invoice decimal math', () => {
  it('calculates line economics with exact decimal arithmetic', () => {
    const result = calculateInvoiceLine({
      quantity: '3',
      available: '5',
      unitPrice: '10',
      discount: '1',
      bonus: '2',
      surcharge: '0.5',
    });
    expect(result.net.toFixed(4)).toBe('27.5000');
    expect(result.pending.toFixed(4)).toBe('2.0000');
    expect(result.quantityStatus).toBe(SupplierInvoiceQuantityStatus.PARCIAL);
  });

  it('anticipates exact and excess allocation without negative pending', () => {
    const exact = calculateInvoiceLine({
      quantity: '5',
      available: '5',
      unitPrice: '1',
      discount: '0',
      bonus: '0',
      surcharge: '0',
    });
    const excess = calculateInvoiceLine({
      quantity: '8',
      available: '5',
      unitPrice: '1',
      discount: '0',
      bonus: '0',
      surcharge: '0',
    });
    expect(exact.quantityStatus).toBe(SupplierInvoiceQuantityStatus.EXACTA);
    expect(excess.quantityStatus).toBe(SupplierInvoiceQuantityStatus.EXCEDIDA);
    expect(excess.pending.toFixed(4)).toBe('0.0000');
    expect(excess.excess.toFixed(4)).toBe('3.0000');
  });

  it('rounds totals HALF_UP and formats without floating point conversion', () => {
    const totals = calculateInvoiceTotals(
      [
        calculateInvoiceLine({
          quantity: '1',
          available: '1',
          unitPrice: '10.55555',
          discount: '0',
          bonus: '0',
          surcharge: '0',
        }).net,
      ],
      '2.2167',
    );
    expect(totals.netTotal.toFixed(4)).toBe('10.5556');
    expect(totals.totalAmount.toFixed(4)).toBe('12.7723');
    expect(formatDecimalAr('1234567.5', 2)).toBe('1.234.567,50');
  });

  it('supports percentage adjustments and IVA without floating point conversion', () => {
    const line = calculateInvoiceLine({
      quantity: '2',
      available: '2',
      unitPrice: '100',
      discount: '10',
      bonus: '5',
      surcharge: '2',
      discountMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      bonusMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      surchargeMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
    });
    expect(line.net.toFixed(4)).toBe('174.0000');
    const totals = calculateInvoiceTotals(
      [line.net],
      '21',
      SupplierInvoiceAdjustmentMode.PERCENTAGE,
    );
    expect(totals.taxTotal.toFixed(4)).toBe('36.5400');
    expect(totals.totalAmount.toFixed(4)).toBe('210.5400');
  });
});

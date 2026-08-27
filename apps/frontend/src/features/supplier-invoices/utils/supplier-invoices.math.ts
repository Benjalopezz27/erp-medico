import Decimal from 'decimal.js';
import { SupplierInvoiceQuantityStatus } from '../types/supplier-invoices.types';

export const ZERO_DECIMAL = '0.0000';

export function safeDecimal(value: string | undefined | null): Decimal {
  try {
    const parsed = new Decimal(value || 0);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

export function calculateInvoiceLine(input: {
  quantity: string;
  available: string;
  unitPrice: string;
  discount: string;
  bonus: string;
  surcharge: string;
}) {
  const quantity = safeDecimal(input.quantity);
  const available = safeDecimal(input.available);
  const net = quantity
    .times(safeDecimal(input.unitPrice))
    .minus(safeDecimal(input.discount))
    .minus(safeDecimal(input.bonus))
    .plus(safeDecimal(input.surcharge))
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  const allocated = Decimal.min(quantity, available);
  const pending = Decimal.max(available.minus(allocated), 0);
  const excess = Decimal.max(quantity.minus(available), 0);
  const quantityStatus = excess.gt(0)
    ? SupplierInvoiceQuantityStatus.EXCEDIDA
    : pending.gt(0)
      ? SupplierInvoiceQuantityStatus.PARCIAL
      : SupplierInvoiceQuantityStatus.EXACTA;
  return { net, pending, excess, quantityStatus };
}

export function calculateInvoiceTotals(lines: Decimal[], tax: string) {
  const netTotal = lines
    .reduce((total, line) => total.plus(line), new Decimal(0))
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  return {
    netTotal,
    taxTotal: safeDecimal(tax).toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
    totalAmount: netTotal.plus(safeDecimal(tax)).toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
  };
}

export function formatDecimalAr(value: string | Decimal, places = 4): string {
  const fixed = (value instanceof Decimal ? value : safeDecimal(value)).toFixed(places);
  const [integer, decimals] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals ? `${grouped},${decimals}` : grouped;
}

export function formatMoneyAr(value: string | Decimal): string {
  return `$ ${formatDecimalAr(value, 2)}`;
}

export function argentinaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

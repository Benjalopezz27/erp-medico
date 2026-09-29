import Decimal from 'decimal.js';

export interface AllocatableInvoice {
  id: string;
  currentBalance: string;
  createdAt: Date | string;
}

/** Suma importes decimales (strings, inválidos o vacíos cuentan 0). */
export function sumAmounts(values: string[]): Decimal {
  return values.reduce((sum, value) => {
    try {
      return sum.plus(value === '' ? 0 : value);
    } catch {
      return sum;
    }
  }, new Decimal(0));
}

/**
 * Previsualiza la cascada por antigüedad del servidor: cancela desde la
 * factura más vieja (createdAt, luego id) hasta agotar el monto. El servidor
 * recalcula; esto solo llena los inputs.
 */
export function allocateByAge(
  invoices: AllocatableInvoice[],
  total: string,
): Record<string, string> {
  let remaining: Decimal;
  try {
    remaining = new Decimal(total === '' ? 0 : total);
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  const ordered = [...invoices].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const invoice of ordered) {
    if (!remaining.greaterThan(0)) break;
    const amount = Decimal.min(remaining, invoice.currentBalance);
    if (amount.greaterThan(0)) result[invoice.id] = amount.toFixed(2);
    remaining = remaining.minus(amount);
  }
  return result;
}

/** Monto con hasta 2 decimales, positivo. */
export const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

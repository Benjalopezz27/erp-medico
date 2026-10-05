import Decimal from 'decimal.js';

const BALANCE = /^\d{1,12}([.,]\d{1,2})?$/;

export const isValidBalance = (value: string): boolean => BALANCE.test(value.trim());

export const normalizeBalance = (value: string): string => value.trim().replace(',', '.');

/** Contado menos esperado, o null si el contado no es válido todavía. */
export function cashDifference(actual: string, expected: string): string | null {
  if (!isValidBalance(actual)) return null;
  return new Decimal(normalizeBalance(actual)).minus(expected).toFixed(2);
}

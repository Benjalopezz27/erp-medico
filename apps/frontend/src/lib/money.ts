import Decimal from 'decimal.js';

const EMPTY = '—';
const DEFAULT_DECIMALS = 2;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function toDecimal(value: unknown): Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    const decimal = new Decimal(String(value));
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

export interface FormatCurrencyOptions {
  decimals?: number;
  signed?: boolean;
}

/** Formats an amount as ARS (`$ 1.500.000,00`). Empty or invalid values render `—`. */
export function formatCurrency(
  value: string | number | Decimal | null | undefined,
  { decimals = DEFAULT_DECIMALS, signed = false }: FormatCurrencyOptions = {},
): string {
  const decimal = toDecimal(value);
  if (!decimal) return EMPTY;
  const fixed = decimal.abs().toFixed(decimals, Decimal.ROUND_HALF_UP);
  const [integer, fraction] = fixed.split('.');
  const body = `$ ${groupThousands(integer)}${fraction ? `,${fraction}` : ''}`;
  const negative = decimal.isNegative() && !new Decimal(fixed).isZero();
  if (negative) return `-${body}`;
  return signed && !new Decimal(fixed).isZero() ? `+${body}` : body;
}

/** Raw value (`"1500000.5"`, `"1500."` while typing) to display text (`"1.500.000,5"`). */
export function formatMoneyInput(raw: string): string {
  const negative = raw.startsWith('-');
  const [integer, fraction] = raw.replace('-', '').split('.');
  const body = groupThousands(integer);
  return `${negative ? '-' : ''}${body}${fraction === undefined ? '' : `,${fraction}`}`;
}

export interface ParseMoneyOptions {
  decimals: number;
  max?: string;
  allowNegative?: boolean;
  /** Pasted text may use a lone `.` as decimal separator (`"1500000.5"`). */
  pasted?: boolean;
}

function decimalSeparatorIndex(clean: string, pasted: boolean): number {
  const comma = clean.indexOf(',');
  if (comma >= 0) return comma;
  const dots = clean.match(/\./g)?.length ?? 0;
  const dot = clean.indexOf('.');
  if (!pasted || dots !== 1) return -1;
  return clean.length - dot - 1 === 3 ? -1 : dot;
}

/**
 * Display text to normalized raw value. Returns `null` when the text must be rejected
 * (above `max`), so callers keep the previous value.
 */
export function parseMoneyInput(
  text: string,
  { decimals, max, allowNegative = false, pasted = false }: ParseMoneyOptions,
): string | null {
  const negative = allowNegative && text.trim().startsWith('-');
  const clean = text.replace(/[^\d,.]/g, '');
  const sep = decimalSeparatorIndex(clean, pasted);
  const intPart = (sep < 0 ? clean : clean.slice(0, sep)).replace(/\D/g, '');
  const fracPart =
    sep < 0
      ? ''
      : clean
          .slice(sep + 1)
          .replace(/\D/g, '')
          .slice(0, decimals);
  const hasSep = sep >= 0 && decimals > 0;
  const integer = intPart.replace(/^0+(?=\d)/, '');
  if (!integer && !hasSep) return negative ? '-' : '';
  const raw = `${negative ? '-' : ''}${integer || '0'}${hasSep ? `.${fracPart}` : ''}`;
  if (max && new Decimal(raw.replace(/\.$/, '') || '0').abs().gt(max)) return null;
  return raw;
}

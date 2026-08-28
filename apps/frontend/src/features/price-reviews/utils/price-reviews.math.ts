import Decimal from 'decimal.js';

function parseDecimal(value: string | null | undefined): Decimal | null {
  try {
    const parsed = new Decimal(value ?? '');
    return parsed.isFinite() ? parsed : null;
  } catch {
    return null;
  }
}

function groupInteger(value: string): string {
  const sign = value.startsWith('-') ? '-' : '';
  const digits = sign ? value.slice(1) : value;
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatPriceReviewMoney(value: string | null | undefined): string {
  const parsed = parseDecimal(value);
  if (!parsed) return '—';
  const [integer, decimals] = parsed.toFixed(2, Decimal.ROUND_HALF_UP).split('.');
  return `$ ${groupInteger(integer)},${decimals}`;
}

export function formatPriceReviewPercentage(value: string | null | undefined): string {
  const parsed = parseDecimal(value);
  if (!parsed) return '—';
  return `${parsed.toFixed(2, Decimal.ROUND_HALF_UP).replace('.', ',')} %`;
}

export function calculateCostVariation(
  previous: string,
  current: string,
): {
  label: string;
  direction: 'up' | 'down' | 'same' | 'unknown';
} {
  const before = parseDecimal(previous);
  const after = parseDecimal(current);
  if (!before || !after || before.lt(0) || after.lt(0)) return { label: '—', direction: 'unknown' };
  if (before.eq(0)) {
    return after.eq(0)
      ? { label: '0,00 %', direction: 'same' }
      : { label: 'Nuevo costo', direction: 'up' };
  }
  const variation = after.minus(before).div(before).times(100);
  const prefix = variation.gt(0) ? '+' : '';
  return {
    label: `${prefix}${variation.toFixed(2, Decimal.ROUND_HALF_UP).replace('.', ',')} %`,
    direction: variation.gt(0) ? 'up' : variation.lt(0) ? 'down' : 'same',
  };
}

export function normalizeCustomPrice(
  value: string,
): { success: true; value: string } | { success: false; message: string } {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return { success: false, message: 'Ingrese un precio positivo con hasta 2 decimales.' };
  }
  const parsed = parseDecimal(normalized);
  if (!parsed || !parsed.gt(0)) {
    return { success: false, message: 'El precio debe ser mayor que cero.' };
  }
  return { success: true, value: parsed.toFixed(2, Decimal.ROUND_HALF_UP) };
}

export function formatPriceReviewDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
}

export function formatReviewAge(value: string, now = new Date()): string {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return '—';
  const elapsedHours = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 3_600_000));
  if (elapsedHours < 1) return 'Hace menos de 1 h';
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;
  const days = Math.floor(elapsedHours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

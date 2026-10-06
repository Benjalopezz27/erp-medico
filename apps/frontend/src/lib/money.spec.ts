import { describe, expect, it } from 'vitest';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from './money';

describe('formatCurrency', () => {
  it('groups thousands with es-AR separators', () => {
    expect(formatCurrency('1500000.5')).toBe('$ 1.500.000,50');
    expect(formatCurrency(1250.5)).toBe('$ 1.250,50');
    expect(formatCurrency(0)).toBe('$ 0,00');
  });

  it('returns a dash for empty or invalid values', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency('')).toBe('—');
    expect(formatCurrency('abc')).toBe('—');
  });

  it('keeps the sign of negative amounts', () => {
    expect(formatCurrency('-1250.5')).toBe('-$ 1.250,50');
  });

  it('supports explicit sign and custom decimals', () => {
    expect(formatCurrency('10', { signed: true })).toBe('+$ 10,00');
    expect(formatCurrency('-10', { signed: true })).toBe('-$ 10,00');
    expect(formatCurrency('0', { signed: true })).toBe('$ 0,00');
    expect(formatCurrency('12.3456', { decimals: 4 })).toBe('$ 12,3456');
  });

  it('does not lose precision beyond float range', () => {
    expect(formatCurrency('12345678901234.56')).toBe('$ 12.345.678.901.234,56');
  });
});

describe('parseMoneyInput', () => {
  const opts = { decimals: 2 };

  it('round-trips formatted text and raw value', () => {
    expect(parseMoneyInput('1.500.000,5', opts)).toBe('1500000.5');
    expect(formatMoneyInput('1500000.5')).toBe('1.500.000,5');
  });

  it('strips separators while typing', () => {
    expect(parseMoneyInput('1.500.000', opts)).toBe('1500000');
    expect(parseMoneyInput('', opts)).toBe('');
  });

  it('keeps a trailing decimal separator while typing', () => {
    expect(parseMoneyInput('1.500,', opts)).toBe('1500.');
    expect(formatMoneyInput('1500.')).toBe('1.500,');
  });

  it('treats dots as thousands separators when typing', () => {
    expect(parseMoneyInput('1.50', opts)).toBe('150');
  });

  it('reads a lone dot as decimal only when pasted and not a thousands group', () => {
    expect(parseMoneyInput('1500000.5', { ...opts, pasted: true })).toBe('1500000.5');
    expect(parseMoneyInput('1.500', { ...opts, pasted: true })).toBe('1500');
  });

  it('ignores non numeric characters', () => {
    expect(parseMoneyInput('$ 12ab3', opts)).toBe('123');
  });

  it('truncates extra decimals', () => {
    expect(parseMoneyInput('10,999', opts)).toBe('10.99');
    expect(parseMoneyInput('1,23456', { decimals: 4 })).toBe('1.2345');
  });

  it('rejects values above max', () => {
    expect(parseMoneyInput('1000', { decimals: 2, max: '999.99' })).toBeNull();
    expect(parseMoneyInput('999,99', { decimals: 2, max: '999.99' })).toBe('999.99');
  });

  it('ignores minus unless negatives are allowed', () => {
    expect(parseMoneyInput('-5', opts)).toBe('5');
    expect(parseMoneyInput('-5', { ...opts, allowNegative: true })).toBe('-5');
  });

  it('drops leading zeros', () => {
    expect(parseMoneyInput('007', opts)).toBe('7');
    expect(parseMoneyInput('0,5', opts)).toBe('0.5');
  });
});

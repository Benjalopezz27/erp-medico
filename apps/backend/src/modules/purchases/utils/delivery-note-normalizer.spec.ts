import { normalizeDeliveryNoteNumber } from './delivery-note-normalizer';
import { BadRequestException } from '@nestjs/common';

describe('normalizeDeliveryNoteNumber', () => {
  it('trims leading/trailing whitespace and converts to uppercase', () => {
    expect(normalizeDeliveryNoteNumber('  rem-001a  ')).toBe('REM-001A');
  });

  it('collapses multiple internal spaces into a single space', () => {
    expect(normalizeDeliveryNoteNumber('REM   0001   1234')).toBe(
      'REM 0001 1234',
    );
  });

  it('standardizes delimiter spacing around hyphens and slashes', () => {
    expect(normalizeDeliveryNoteNumber('0001 - 00001234')).toBe(
      '0001-00001234',
    );
    expect(normalizeDeliveryNoteNumber('0001 / 00001234')).toBe(
      '0001/00001234',
    );
  });

  it('preserves distinct commercial delivery note formats', () => {
    expect(normalizeDeliveryNoteNumber('0001-1234')).toBe('0001-1234');
    expect(normalizeDeliveryNoteNumber('0001/1234')).toBe('0001/1234');
    expect(normalizeDeliveryNoteNumber('0001.1234')).toBe('0001.1234');
    expect(normalizeDeliveryNoteNumber('R-001')).toBe('R-001');
    expect(normalizeDeliveryNoteNumber('R-01')).toBe('R-01');
  });

  it('handles Unicode NFKC compatibility characters', () => {
    // Full-width numbers: １２３４ -> 1234
    expect(normalizeDeliveryNoteNumber('ＲＥＭ-１２３４')).toBe('REM-1234');
  });

  it('throws BadRequestException for null, undefined, or empty strings', () => {
    expect(() => normalizeDeliveryNoteNumber('')).toThrow(BadRequestException);
    expect(() => normalizeDeliveryNoteNumber('   ')).toThrow(
      BadRequestException,
    );
    expect(() =>
      normalizeDeliveryNoteNumber(null as unknown as string),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException for strings with control characters', () => {
    expect(() => normalizeDeliveryNoteNumber('0001\x00-1234')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeDeliveryNoteNumber('0001\n-1234')).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for strings exceeding 50 characters', () => {
    const longStr = 'A'.repeat(51);
    expect(() => normalizeDeliveryNoteNumber(longStr)).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for strings with disallowed characters', () => {
    expect(() => normalizeDeliveryNoteNumber('0001#1234')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeDeliveryNoteNumber('0001@1234')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeDeliveryNoteNumber('0001;1234')).toThrow(
      BadRequestException,
    );
  });
});

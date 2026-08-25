import {
  isValidCuit,
  sanitizeCuit,
  normalizeCuitForSearch,
  formatCuit,
} from '@erp/shared-types';
import { IsValidCuitConstraint } from './is-cuit.validator';

describe('CUIT Validation & Utilities Suite', () => {
  const validator = new IsValidCuitConstraint();

  describe('sanitizeCuit', () => {
    it('returns 11 digits when input contains only digits', () => {
      expect(sanitizeCuit('30500010912')).toBe('30500010912');
    });

    it('removes allowed separators (hyphens, dots, spaces)', () => {
      expect(sanitizeCuit('30-50001091-2')).toBe('30500010912');
      expect(sanitizeCuit('30.50001091.2')).toBe('30500010912');
      expect(sanitizeCuit(' 30 50001091 2 ')).toBe('30500010912');
    });

    it('returns null if input contains invalid characters (letters or illegal symbols)', () => {
      expect(sanitizeCuit('20abc12345678x6')).toBeNull();
      expect(sanitizeCuit('30/50001091/2')).toBeNull();
      expect(sanitizeCuit('30_50001091_2')).toBeNull();
      expect(sanitizeCuit('30#50001091$2')).toBeNull();
    });

    it('returns null if length after cleaning is not 11 digits', () => {
      expect(sanitizeCuit('3050001091')).toBeNull(); // 10 digits
      expect(sanitizeCuit('305000109123')).toBeNull(); // 12 digits
      expect(sanitizeCuit('')).toBeNull();
      expect(sanitizeCuit(null)).toBeNull();
      expect(sanitizeCuit(undefined)).toBeNull();
    });
  });

  describe('normalizeCuitForSearch', () => {
    it('extracts all digits tolerantly from search strings', () => {
      expect(normalizeCuitForSearch('30-5000')).toBe('305000');
      expect(normalizeCuitForSearch(' 30.5000.1091 ')).toBe('3050001091');
      expect(normalizeCuitForSearch('')).toBe('');
      expect(normalizeCuitForSearch(null)).toBe('');
    });
  });

  describe('isValidCuit & IsValidCuitConstraint', () => {
    it('accepts valid real-world CUITs with and without formatting', () => {
      const validCuits = [
        '30-50001091-2', // AFIP Corporate
        '30500010912',
        '20-12345678-6', // Individual Male
        '20123456786',
        '27-23456789-1', // Individual Female
        '27234567891',
        '30-71142580-9', // Corporate
        '30711425809',
        '20-00000037-0', // Check digit 0 (Sum % 11 === 0)
        '20000000370',
      ];

      for (const cuit of validCuits) {
        expect(isValidCuit(cuit)).toBe(true);
        expect(validator.validate(cuit)).toBe(true);
      }
    });

    it('rejects CUITs with invalid check digits', () => {
      expect(isValidCuit('30-50001091-3')).toBe(false);
      expect(isValidCuit('20-12345678-0')).toBe(false);
      expect(isValidCuit('27-23456789-9')).toBe(false);
      expect(validator.validate('30-50001091-3')).toBe(false);
    });

    it('rejects CUIT with Mod 11 residue 1 (calculated check digit 10)', () => {
      // 30-53093356 has sum 144. 144 % 11 = 1. 11 - 1 = 10 (invalid single digit).
      expect(isValidCuit('30-53093356-0')).toBe(false);
      expect(isValidCuit('30-53093356-1')).toBe(false);
    });

    it('rejects CUITs with invalid prefixes', () => {
      expect(isValidCuit('10-12345678-9')).toBe(false);
      expect(isValidCuit('99-12345678-9')).toBe(false);
      expect(isValidCuit('15-50001091-2')).toBe(false);
    });

    it('rejects CUITs with letters or illegal characters', () => {
      expect(isValidCuit('20abc12345678x6')).toBe(false);
      expect(validator.validate('20abc12345678x6')).toBe(false);
    });

    it('rejects null, undefined, non-strings, or empty values', () => {
      expect(isValidCuit(null)).toBe(false);
      expect(isValidCuit(undefined)).toBe(false);
      expect(isValidCuit('')).toBe(false);
      expect(validator.validate(null)).toBe(false);
      expect(validator.validate(12345678901)).toBe(false);
    });
  });

  describe('formatCuit', () => {
    it('formats 11-digit canonical strings to XX-XXXXXXXX-X format', () => {
      expect(formatCuit('30500010912')).toBe('30-50001091-2');
      expect(formatCuit('30-50001091-2')).toBe('30-50001091-2');
      expect(formatCuit(' 30 50001091 2 ')).toBe('30-50001091-2');
    });

    it('returns trimmed input if not 11 digits', () => {
      expect(formatCuit('12345')).toBe('12345');
      expect(formatCuit('')).toBe('');
      expect(formatCuit(null)).toBe('');
    });
  });
});

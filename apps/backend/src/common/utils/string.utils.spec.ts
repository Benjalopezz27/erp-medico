import { normalizeEmail } from './string.utils';

describe('string.utils', () => {
  describe('normalizeEmail', () => {
    it('should trim surrounding whitespace and lowercase the email', () => {
      expect(normalizeEmail('  Admin@ERP.COM  ')).toBe('admin@erp.com');
      expect(normalizeEmail('vendedor@ERP.com\t')).toBe('vendedor@erp.com');
      expect(normalizeEmail('\n user@domain.com \n')).toBe('user@domain.com');
    });

    it('should return empty string for null, undefined, or empty inputs', () => {
      expect(normalizeEmail('')).toBe('');
      expect(normalizeEmail('   ')).toBe('');
      expect(normalizeEmail(null as unknown as string)).toBe('');
      expect(normalizeEmail(undefined as unknown as string)).toBe('');
    });

    it('should leave already normalized emails intact', () => {
      expect(normalizeEmail('admin@erp.com')).toBe('admin@erp.com');
      expect(normalizeEmail('user.name+tag@sub.domain.org')).toBe(
        'user.name+tag@sub.domain.org',
      );
    });
  });
});

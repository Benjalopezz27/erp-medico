import { describe, expect, it } from 'vitest';
import { createUnitSchema, updateUnitSchema } from './units.schema';

describe('units.schema', () => {
  describe('createUnitSchema', () => {
    it('validates valid unit data', () => {
      const result = createUnitSchema.safeParse({
        name: '  Unidad  ',
        symbol: '  u  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Unidad');
        expect(result.data.symbol).toBe('u');
      }
    });

    it('rejects empty name or symbol', () => {
      const emptyName = createUnitSchema.safeParse({
        name: '   ',
        symbol: 'u',
      });
      expect(emptyName.success).toBe(false);

      const emptySymbol = createUnitSchema.safeParse({
        name: 'Unidad',
        symbol: '   ',
      });
      expect(emptySymbol.success).toBe(false);
    });

    it('rejects values exceeding max lengths', () => {
      const longName = createUnitSchema.safeParse({
        name: 'a'.repeat(51),
        symbol: 'u',
      });
      expect(longName.success).toBe(false);

      const longSymbol = createUnitSchema.safeParse({
        name: 'Unidad',
        symbol: 'a'.repeat(21),
      });
      expect(longSymbol.success).toBe(false);
    });
  });

  describe('updateUnitSchema', () => {
    it('allows partial update of name or symbol', () => {
      const result = updateUnitSchema.safeParse({
        symbol: 'cj',
      });

      expect(result.success).toBe(true);
    });
  });
});

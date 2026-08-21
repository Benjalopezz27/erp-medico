import { describe, expect, it } from 'vitest';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

describe('categories.schema', () => {
  describe('createCategorySchema', () => {
    it('validates valid input and transforms description', () => {
      const result = createCategorySchema.safeParse({
        name: '  Analgésicos  ',
        description: '  Medicamentos contra el dolor  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Analgésicos');
        expect(result.data.description).toBe('Medicamentos contra el dolor');
      }
    });

    it('converts empty description to null', () => {
      const result = createCategorySchema.safeParse({
        name: 'Descartables',
        description: '   ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it('rejects empty name', () => {
      const result = createCategorySchema.safeParse({
        name: '   ',
      });

      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 chars', () => {
      const result = createCategorySchema.safeParse({
        name: 'a'.repeat(101),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateCategorySchema', () => {
    it('allows partial update and converts empty description to null', () => {
      const result = updateCategorySchema.safeParse({
        description: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });
  });
});

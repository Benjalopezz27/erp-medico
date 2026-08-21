import { describe, expect, it } from 'vitest';
import { UserRole } from '@erp/shared-types';
import { createUserSchema, updateUserSchema } from './users.schema';

describe('users validation schemas', () => {
  describe('createUserSchema', () => {
    it('accepts valid user creation input', () => {
      const result = createUserSchema.safeParse({
        name: 'Carlos Gomez',
        email: 'carlos@erp.com',
        password: 'Password123!',
        role: UserRole.VENDEDOR,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('carlos@erp.com');
        expect(result.data.name).toBe('Carlos Gomez');
      }
    });

    it('rejects empty or whitespace-only name', () => {
      const result = createUserSchema.safeParse({
        name: '   ',
        email: 'carlos@erp.com',
        password: 'Password123!',
        role: UserRole.VENDEDOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El nombre es obligatorio');
      }
    });

    it('rejects invalid email formats', () => {
      const result = createUserSchema.safeParse({
        name: 'Carlos Gomez',
        email: 'invalid-email',
        password: 'Password123!',
        role: UserRole.VENDEDOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Ingrese un correo electrónico válido');
      }
    });

    it('rejects password shorter than 8 characters', () => {
      const result = createUserSchema.safeParse({
        name: 'Carlos Gomez',
        email: 'carlos@erp.com',
        password: 'Pass1!',
        role: UserRole.VENDEDOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'La contraseña debe tener al menos 8 caracteres',
        );
      }
    });

    it('rejects password missing numbers or special characters', () => {
      const result = createUserSchema.safeParse({
        name: 'Carlos Gomez',
        email: 'carlos@erp.com',
        password: 'PasswordOnly',
        role: UserRole.VENDEDOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'La contraseña debe contener al menos 1 mayúscula',
        );
      }
    });

    it('rejects invalid role', () => {
      const result = createUserSchema.safeParse({
        name: 'Carlos Gomez',
        email: 'carlos@erp.com',
        password: 'Password123!',
        role: 'SUPERADMIN',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Seleccione un rol válido');
      }
    });
  });

  describe('updateUserSchema', () => {
    it('accepts valid update input without password', () => {
      const result = updateUserSchema.safeParse({
        name: 'Carlos Modificado',
        email: 'carlos.mod@erp.com',
        role: UserRole.ADMINISTRADOR,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Carlos Modificado');
        expect(result.data.email).toBe('carlos.mod@erp.com');
        expect(result.data.role).toBe(UserRole.ADMINISTRADOR);
      }
    });

    it('rejects invalid email during update', () => {
      const result = updateUserSchema.safeParse({
        name: 'Carlos Modificado',
        email: 'carlos-not-an-email',
        role: UserRole.ADMINISTRADOR,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Ingrese un correo electrónico válido');
      }
    });
  });
});

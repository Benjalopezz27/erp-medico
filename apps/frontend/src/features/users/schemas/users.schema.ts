import { z } from 'zod';
import { UserRole } from '@erp/shared-types';

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingrese un correo electrónico válido')
    .max(255, 'El correo no puede superar los 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede superar los 128 caracteres')
    .regex(
      /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
      'La contraseña debe contener al menos 1 mayúscula, 1 minúscula y 1 número o carácter especial',
    ),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Seleccione un rol válido' }),
  }),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El correo electrónico es obligatorio')
    .email('Ingrese un correo electrónico válido')
    .max(255, 'El correo no puede superar los 255 caracteres'),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Seleccione un rol válido' }),
  }),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

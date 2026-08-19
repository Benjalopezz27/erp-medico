import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingrese un correo electrónico válido')
    .max(255, 'El correo no puede exceder 255 caracteres'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

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

// Mirrors backend CreateUserDto password rules (8-128, upper + lower + digit|symbol).
export const passwordRules = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede exceder 128 caracteres')
  .regex(/(?=.*[A-Z])/, 'Debe incluir una mayúscula')
  .regex(/(?=.*[a-z])/, 'Debe incluir una minúscula')
  .regex(/(?=.*[\d\W])/, 'Debe incluir un dígito o símbolo');

export const nameRule = z
  .string()
  .trim()
  .min(1, 'El nombre es requerido')
  .max(100, 'El nombre no puede exceder 100 caracteres');

export const signupSchema = z
  .object({
    name: nameRule,
    email: loginSchema.shape.email,
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Confirme la contraseña'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

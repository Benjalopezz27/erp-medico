import { z } from 'zod';
import { nameRule, passwordRules } from '@/features/auth/auth.schema';

export const profileSchema = z.object({ name: nameRule });
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingrese su contraseña actual'),
    newPassword: passwordRules,
    confirmPassword: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta de la actual',
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

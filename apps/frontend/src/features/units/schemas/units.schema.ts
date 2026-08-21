import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre de la unidad es obligatorio')
    .max(50, 'El nombre no puede exceder los 50 caracteres'),
  symbol: z
    .string()
    .trim()
    .min(1, 'El símbolo es obligatorio')
    .max(20, 'El símbolo no puede exceder los 20 caracteres'),
});

export type CreateUnitFormData = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede ser una cadena vacía')
    .max(50, 'El nombre no puede exceder los 50 caracteres')
    .optional(),
  symbol: z
    .string()
    .trim()
    .min(1, 'El símbolo no puede ser una cadena vacía')
    .max(20, 'El símbolo no puede exceder los 20 caracteres')
    .optional(),
});

export type UpdateUnitFormData = z.infer<typeof updateUnitSchema>;

import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre de la categoría es obligatorio')
    .max(100, 'El nombre no puede exceder los 100 caracteres'),
  description: z
    .string()
    .max(255, 'La descripción no puede exceder los 255 caracteres')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
});

export type CreateCategoryFormData = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre no puede ser una cadena vacía')
    .max(100, 'El nombre no puede exceder los 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(255, 'La descripción no puede exceder los 255 caracteres')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
});

export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;

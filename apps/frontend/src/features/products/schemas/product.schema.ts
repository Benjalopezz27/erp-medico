import { z } from 'zod';

export const productConversionSchema = z.object({
  id: z.string().optional(),
  presentationUnitId: z
    .string({ required_error: 'Debe seleccionar una unidad de presentación.' })
    .uuid('Debe seleccionar una unidad válida.'),
  conversionFactor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z
      .number({ required_error: 'El factor de conversión es obligatorio.' })
      .gt(0, 'El factor de conversión debe ser mayor que 0.')
      .max(999999.9999, 'El factor de conversión no puede exceder 999999.9999.')
      .refine(
        (val) => {
          const parts = val.toString().split('.');
          return !parts[1] || parts[1].length <= 4;
        },
        { message: 'El factor de conversión puede tener como máximo 4 decimales.' },
      ),
  ),
});

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre del producto es obligatorio.')
      .max(150, 'El nombre no puede exceder 150 caracteres.'),
    description: z
      .string()
      .trim()
      .max(500, 'La descripción no puede exceder 500 caracteres.')
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
    categoryId: z
      .string({ required_error: 'Debe seleccionar una categoría.' })
      .uuid('Debe seleccionar una categoría válida.'),
    baseUnitId: z
      .string({ required_error: 'Debe seleccionar una unidad base.' })
      .uuid('Debe seleccionar una unidad base válida.'),
    minStock: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
      z
        .number({ required_error: 'El stock mínimo es obligatorio.' })
        .min(0, 'El stock mínimo no puede ser negativo.')
        .max(9999999999.99, 'El stock mínimo no puede exceder 9999999999.99.')
        .refine(
          (val) => {
            const parts = val.toString().split('.');
            return !parts[1] || parts[1].length <= 2;
          },
          { message: 'El stock mínimo puede tener como máximo 2 decimales.' },
        ),
    ),
    initialStock: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
      z
        .number({ required_error: 'El stock inicial es obligatorio.' })
        .min(0, 'El stock inicial no puede ser negativo.')
        .max(999999999999.99, 'El stock inicial no puede exceder 999999999999.99.')
        .refine(
          (val) => {
            const parts = val.toString().split('.');
            return !parts[1] || parts[1].length <= 2;
          },
          { message: 'El stock inicial puede tener como máximo 2 decimales.' },
        ),
    ),
    costNet: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z
        .number({ required_error: 'El costo neto es obligatorio.' })
        .min(0, 'El costo neto no puede ser negativo.')
        .max(99999999.9999, 'El costo neto no puede exceder 99999999.9999.')
        .refine(
          (val) => {
            const parts = val.toString().split('.');
            return !parts[1] || parts[1].length <= 4;
          },
          { message: 'El costo neto puede tener como máximo 4 decimales.' },
        ),
    ),
    markupPercentage: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z
        .number({ invalid_type_error: 'El markup debe ser un número.' })
        .min(0, 'El markup no puede ser negativo.')
        .max(1000, 'El markup no puede exceder el 1000%.')
        .refine(
          (val) => {
            if (val === null || val === undefined) return true;
            const parts = val.toString().split('.');
            return !parts[1] || parts[1].length <= 4;
          },
          { message: 'El markup puede tener como máximo 4 decimales.' },
        )
        .nullable()
        .optional(),
    ),
    activePriceNet: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z
        .number({ required_error: 'El precio activo es obligatorio.' })
        .min(0, 'El precio activo no puede ser negativo.')
        .max(9999999999.99, 'El precio activo no puede exceder 9999999999.99.')
        .refine(
          (val) => {
            const parts = val.toString().split('.');
            return !parts[1] || parts[1].length <= 2;
          },
          { message: 'El precio activo puede tener como máximo 2 decimales.' },
        ),
    ),
    conversions: z.array(productConversionSchema).default([]),
  })
  .refine(
    (data) => {
      if (!data.conversions || data.conversions.length === 0) return true;
      return !data.conversions.some((c) => c.presentationUnitId === data.baseUnitId);
    },
    {
      message: 'La unidad de presentación no puede ser igual a la unidad base.',
      path: ['conversions'],
    },
  )
  .refine(
    (data) => {
      if (!data.conversions || data.conversions.length === 0) return true;
      const ids = data.conversions.map((c) => c.presentationUnitId).filter(Boolean);
      return new Set(ids).size === ids.length;
    },
    {
      message: 'No se pueden incluir unidades de presentación repetidas.',
      path: ['conversions'],
    },
  );

export type ProductFormSchemaValues = z.infer<typeof productFormSchema>;

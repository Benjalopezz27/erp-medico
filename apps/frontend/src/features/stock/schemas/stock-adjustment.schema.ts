import { z } from 'zod';
import { StockMovementType } from '@erp/shared-types';

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid({ message: 'El ID del producto debe ser un UUID válido.' }),
  movementType: z.enum(
    [StockMovementType.AJUSTE_ENTRADA, StockMovementType.AJUSTE_SALIDA, StockMovementType.MERMA],
    {
      errorMap: () => ({
        message: 'Selecciona un tipo de movimiento válido.',
      }),
    },
  ),
  quantityBase: z
    .number({
      invalid_type_error: 'La cantidad debe ser un número válido.',
      required_error: 'La cantidad es obligatoria.',
    })
    .positive({ message: 'La cantidad debe ser mayor a 0.' })
    .refine(
      (val) => {
        const decimals = val.toString().split('.')[1];
        return !decimals || decimals.length <= 2;
      },
      { message: 'La cantidad no puede tener más de 2 decimales.' },
    ),
  reason: z
    .string({ required_error: 'El motivo es obligatorio.' })
    .trim()
    .min(1, { message: 'El motivo no puede estar vacío.' })
    .max(500, { message: 'El motivo no puede superar los 500 caracteres.' }),
  documentReference: z
    .string()
    .trim()
    .max(100, {
      message: 'La referencia documental no puede superar los 100 caracteres.',
    })
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;

import Decimal from 'decimal.js';
import { z } from 'zod';
import { SaleReturnItemQuality } from '@erp/shared-types';

export const saleReturnItemSchema = z.object({
  saleItemId: z.string().uuid(),
  selected: z.boolean(),
  remainingQuantity: z.number(),
  quantityBase: z
    .number()
    .positive('La cantidad debe ser mayor a cero.')
    .refine((val) => Number.isInteger(Number(new Decimal(val).times(100))), {
      message: 'La cantidad admite hasta dos decimales.',
    }),
  quality: z.nativeEnum(SaleReturnItemQuality),
  notes: z.string().max(500, 'Las observaciones no pueden superar 500 caracteres.').optional(),
});

export const saleReturnSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, 'El motivo debe tener al menos 3 caracteres.')
      .max(255, 'El motivo no puede superar 255 caracteres.'),
    items: z.array(saleReturnItemSchema),
  })
  .superRefine((data, ctx) => {
    const selectedItems = data.items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: 'Seleccioná al menos un ítem para devolver.',
      });
      return;
    }

    selectedItems.forEach((item, index) => {
      if (item.quantityBase <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'quantityBase'],
          message: 'La cantidad debe ser mayor a cero.',
        });
      }
      if (item.quantityBase > item.remainingQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'quantityBase'],
          message: `La cantidad no puede superar el remanente (${item.remainingQuantity}).`,
        });
      }
    });
  });

export type SaleReturnFormValues = z.infer<typeof saleReturnSchema>;

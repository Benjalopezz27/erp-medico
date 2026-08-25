import { z } from 'zod';

const DECIMAL_4_REGEX = /^\d+(\.\d{1,4})?$/;

export const supplierProductFormSchema = z
  .object({
    productId: z.string().uuid({ message: 'Debe seleccionar un producto válido' }),
    baseUnitId: z.string().optional(),
    supplierExternalCode: z
      .string()
      .trim()
      .min(1, { message: 'El código externo del proveedor es obligatorio' })
      .max(100, {
        message: 'El código externo no puede exceder 100 caracteres',
      }),
    supplierDescription: z
      .string()
      .trim()
      .max(255, { message: 'La descripción no puede exceder 255 caracteres' })
      .optional()
      .nullable(),
    purchaseUnitId: z.string().uuid({ message: 'Debe seleccionar una unidad de compra' }),
    conversionFactorToBase: z
      .number({
        invalid_type_error: 'El factor de conversión debe ser un número',
      })
      .positive({
        message: 'El factor de conversión debe ser estrictamente mayor a 0',
      })
      .refine(
        (val) => DECIMAL_4_REGEX.test(val.toString()),
        'El factor de conversión no puede tener más de 4 decimales',
      ),
    usualCostNet: z
      .number({
        invalid_type_error: 'El costo habitual debe ser un número',
      })
      .min(0, { message: 'El costo habitual no puede ser negativo' })
      .refine(
        (val) => DECIMAL_4_REGEX.test(val.toString()),
        'El costo habitual no puede tener más de 4 decimales',
      )
      .optional()
      .nullable(),
    isPrimarySupplier: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.baseUnitId && data.purchaseUnitId === data.baseUnitId) {
      if (data.conversionFactorToBase !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['conversionFactorToBase'],
          message:
            'Cuando la unidad de compra coincide con la unidad base, el factor debe ser exactamente 1',
        });
      }
    }
  });

export type SupplierProductFormData = z.infer<typeof supplierProductFormSchema>;

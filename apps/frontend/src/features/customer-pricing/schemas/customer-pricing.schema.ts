import Decimal from 'decimal.js';
import { z } from 'zod';
import { CustomerSpecialPriceMode } from '@erp/shared-types';

const decimalValue = (scale: number, message: string, allowZero: boolean) =>
  z
    .string()
    .trim()
    .refine((value) => {
      const pattern =
        scale === 2 ? /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/ : /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;
      if (!pattern.test(value)) return false;
      try {
        const decimal = new Decimal(value);
        return decimal.isFinite() && (allowZero ? decimal.gte(0) : decimal.gt(0));
      } catch {
        return false;
      }
    }, message);

export const customerSpecialPriceFormSchema = z
  .object({
    mode: z.nativeEnum(CustomerSpecialPriceMode),
    value: z.string(),
  })
  .superRefine((data, context) => {
    const schema =
      data.mode === CustomerSpecialPriceMode.FIXED_PRICE
        ? decimalValue(2, 'Ingresá un precio positivo con hasta dos decimales.', false)
        : decimalValue(4, 'Ingresá un descuento mayor que 0 y menor que 100.', false).refine(
            (value) => new Decimal(value).lt(100),
            'El descuento debe ser menor que 100%.',
          );
    const result = schema.safeParse(data.value);
    if (!result.success)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: result.error.issues[0].message,
      });
  });

export const customerGeneralDiscountSchema = z.object({
  percentage: decimalValue(4, 'Ingresá un porcentaje entre 0 y menos de 100.', true).refine(
    (value) => new Decimal(value).lt(100),
    'El descuento debe ser menor que 100%.',
  ),
});

export function normalizePricingValue(mode: CustomerSpecialPriceMode, value: string) {
  return mode === CustomerSpecialPriceMode.FIXED_PRICE
    ? new Decimal(value).toFixed(2)
    : new Decimal(value).toFixed(4);
}

import { z } from 'zod';
import { PaymentMethod, SaleStatus, type ISaleSearchParams } from '@erp/shared-types';

const optionalUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional();

export const posSaleSchema = z
  .object({
    customerId: optionalUuid,
    isCreditSale: z.boolean(),
    requiresFiscalInvoice: z.boolean(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantityBase: z
            .number()
            .positive('La cantidad debe ser mayor a cero.')
            .refine((value) => Number.isInteger(value * 100), {
              message: 'La cantidad admite hasta dos decimales.',
            }),
        }),
      )
      .min(1, 'Agregá al menos un producto.'),
  })
  .superRefine((value, context) => {
    if (value.isCreditSale && !value.customerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Seleccioná un cliente para vender a crédito.',
      });
    }
    if (value.isCreditSale && !value.requiresFiscalInvoice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requiresFiscalInvoice'],
        message: 'La venta a crédito requiere factura.',
      });
    }
    if (value.isCreditSale && value.paymentMethod !== PaymentMethod.CTA_CTE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'La venta a crédito debe usar cuenta corriente.',
      });
    }
    if (!value.isCreditSale && value.paymentMethod === PaymentMethod.CTA_CTE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Seleccioná un medio de pago de contado.',
      });
    }
  });

export type PosSaleFormValues = z.infer<typeof posSaleSchema>;

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateSaleSearchParams(search: Record<string, unknown>): ISaleSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const from = isCalendarDate(search.from) ? search.from : undefined;
  const to = isCalendarDate(search.to) ? search.to : undefined;
  const customerId =
    typeof search.customerId === 'string' && z.string().uuid().safeParse(search.customerId).success
      ? search.customerId
      : undefined;
  const status = Object.values(SaleStatus).includes(search.status as SaleStatus)
    ? (search.status as SaleStatus)
    : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: [10, 20, 50, 100].includes(limit) ? limit : 20,
    from: from && to && from > to ? undefined : from,
    to: from && to && from > to ? undefined : to,
    customerId,
    status,
  };
}

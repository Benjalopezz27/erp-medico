import Decimal from 'decimal.js';
import { z } from 'zod';
import {
  CustomerDocumentType,
  isCustomerTaxConditionCompatible,
  isValidCustomerDocument,
  TaxCondition,
} from '@erp/shared-types';

const nullableText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value?.trim() ? value.trim() : null));

export const customerFormSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, 'El nombre o razón social debe tener al menos 2 caracteres')
      .max(200, 'El nombre o razón social no puede superar los 200 caracteres'),
    documentType: z.nativeEnum(CustomerDocumentType),
    cuitOrDni: z.string().trim().min(1, 'El documento es obligatorio').max(20),
    taxCondition: z.nativeEnum(TaxCondition),
    email: z
      .string()
      .trim()
      .max(255, 'El email no puede superar los 255 caracteres')
      .optional()
      .or(z.literal(''))
      .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: 'Ingresá un email válido',
      })
      .transform((value) => (value?.trim() ? value.trim().toLowerCase() : null)),
    phone: nullableText(50, 'El teléfono no puede superar los 50 caracteres'),
    address: nullableText(255, 'La dirección no puede superar los 255 caracteres'),
    creditLimit: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((value) => {
        if (!value) return true;
        if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return false;
        try {
          const decimal = new Decimal(value);
          return decimal.isFinite() && decimal.gte(0) && decimal.lte('999999999999.99');
        } catch {
          return false;
        }
      }, 'Ingresá un importe no negativo con hasta dos decimales')
      .transform((value) => new Decimal(value || 0).toFixed(2)),
  })
  .superRefine((data, context) => {
    if (!isValidCustomerDocument(data.documentType, data.cuitOrDni)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cuitOrDni'],
        message:
          data.documentType === CustomerDocumentType.DNI
            ? 'El DNI debe contener 7 u 8 dígitos válidos'
            : 'El CUIT debe tener 11 dígitos y un verificador válido',
      });
    }
    if (!isCustomerTaxConditionCompatible(data.documentType, data.taxCondition)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taxCondition'],
        message: 'Un cliente con DNI debe ser Consumidor Final',
      });
    }
  });

export type CustomerFormValues = z.input<typeof customerFormSchema>;
export type CustomerFormOutput = z.output<typeof customerFormSchema>;

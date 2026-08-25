import { z } from 'zod';
import { TaxCondition, isValidCuit } from '@erp/shared-types';

export const supplierFormSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'La razón social es obligatoria')
    .max(200, 'La razón social no puede superar los 200 caracteres'),

  cuit: z
    .string()
    .trim()
    .min(1, 'El CUIT es obligatorio')
    .refine((val) => isValidCuit(val), {
      message:
        'El CUIT ingresado no es válido. Debe contener 11 dígitos con prefijo y dígito verificador válidos (Módulo 11)',
    }),

  taxCondition: z.nativeEnum(TaxCondition, {
    errorMap: () => ({
      message: 'Debe seleccionar una condición fiscal válida',
    }),
  }),

  email: z
    .string()
    .trim()
    .max(255, 'El correo electrónico no puede superar los 255 caracteres')
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      {
        message: 'El formato del correo electrónico no es válido',
      },
    )
    .transform((val) => (val && val.trim() !== '' ? val.trim().toLowerCase() : null)),

  phone: z
    .string()
    .trim()
    .max(50, 'El teléfono no puede superar los 50 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),

  whatsapp: z
    .string()
    .trim()
    .max(50, 'El número de WhatsApp no puede superar los 50 caracteres')
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const digits = val.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      },
      {
        message:
          'El número de WhatsApp debe contener entre 10 y 15 dígitos en formato internacional (ej. 5493514890123)',
      },
    )
    .transform((val) => (val && val.trim() !== '' ? val.replace(/\D/g, '') : null)),

  address: z
    .string()
    .trim()
    .max(255, 'La dirección no puede superar los 255 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),
});

export type SupplierFormValues = z.input<typeof supplierFormSchema>;
export type SupplierFormOutput = z.output<typeof supplierFormSchema>;

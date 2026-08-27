import { z } from 'zod';
import Decimal from 'decimal.js';
import type {
  IPurchaseOrderFormData,
  ICreatePurchaseOrderPayload,
  IUpdatePurchaseOrderPayload,
  IPurchaseOrderDetail,
} from '../types/purchase-orders.types';

export const purchaseOrderItemSchema = z
  .object({
    supplierProductId: z
      .string()
      .uuid({ message: 'Debe seleccionar un producto válido del catálogo' }),
    productId: z.string(),
    productInternalCode: z.string(),
    productName: z.string(),
    supplierSku: z.string(),
    purchaseUnitName: z.string(),
    purchaseUnitSymbol: z.string(),
    conversionFactorToBase: z.number().positive(),
    baseUnitSymbol: z.string(),
    usualCostNet: z.number().nullable().optional(),
    orderedQty: z
      .string()
      .min(1, { message: 'La cantidad es obligatoria' })
      .regex(/^\d+(\.\d{1,4})?$/, { message: 'Máximo 4 decimales' })
      .refine(
        (val) => {
          try {
            const d = new Decimal(val);
            return d.gte('0.0001') && d.lte('99999999.9999');
          } catch {
            return false;
          }
        },
        { message: 'La cantidad debe estar entre 0.0001 y 99999999.9999' },
      ),
    expectedCostUnitNet: z
      .string()
      .min(1, { message: 'El costo unitario esperado es obligatorio' })
      .regex(/^\d+(\.\d{1,4})?$/, { message: 'Máximo 4 decimales' })
      .refine(
        (val) => {
          try {
            const d = new Decimal(val);
            return d.gte('0') && d.lte('99999999.9999');
          } catch {
            return false;
          }
        },
        { message: 'El costo no puede ser negativo ni exceder 99999999.9999' },
      ),
    isDeletedAssociation: z.boolean().optional(),
    driftWarning: z.string().nullable().optional(),
  })
  .refine((item) => !item.isDeletedAssociation, {
    message: 'Este producto ya no existe en el catálogo del proveedor y debe eliminarse',
    path: ['supplierProductId'],
  });

export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().uuid({ message: 'El proveedor es obligatorio' }),
  expectedDeliveryDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
        const [year, month, day] = val.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return (
          date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        );
      },
      { message: 'Fecha de entrega no válida en el calendario (AAAA-MM-DD)' },
    ),
  notes: z
    .string()
    .max(1000, { message: 'Las notas no pueden superar 1000 caracteres' })
    .optional()
    .nullable(),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, { message: 'Debe agregar al menos un ítem a la orden' })
    .refine(
      (items) => {
        const ids = items.map((i) => i.supplierProductId);
        return new Set(ids).size === ids.length;
      },
      { message: 'No se permiten ítems duplicados en la misma orden' },
    ),
});

export function mapFormToCreatePayload(data: IPurchaseOrderFormData): ICreatePurchaseOrderPayload {
  return {
    supplierId: data.supplierId,
    expectedDeliveryDate: data.expectedDeliveryDate?.trim() || null,
    notes: data.notes?.trim() || null,
    items: data.items.map((item) => ({
      supplierProductId: item.supplierProductId,
      orderedQty: new Decimal(item.orderedQty).toNumber(),
      expectedCostUnitNet: new Decimal(item.expectedCostUnitNet).toNumber(),
    })),
  };
}

export function mapFormToUpdatePayload(data: IPurchaseOrderFormData): IUpdatePurchaseOrderPayload {
  return {
    supplierId: data.supplierId,
    expectedDeliveryDate: data.expectedDeliveryDate?.trim() || null,
    notes: data.notes?.trim() || null,
    items: data.items.map((item) => ({
      supplierProductId: item.supplierProductId,
      orderedQty: new Decimal(item.orderedQty).toNumber(),
      expectedCostUnitNet: new Decimal(item.expectedCostUnitNet).toNumber(),
    })),
  };
}

export function mapDetailToFormData(detail: IPurchaseOrderDetail): IPurchaseOrderFormData {
  return {
    supplierId: detail.supplier.id,
    expectedDeliveryDate: detail.expectedDeliveryDate,
    notes: detail.notes,
    items: detail.items.map((item) => ({
      supplierProductId: item.supplierProductId,
      productId: item.productId,
      productInternalCode: item.productCode,
      productName: item.productName,
      supplierSku: item.supplierSku,
      purchaseUnitName: item.purchaseUnitName,
      purchaseUnitSymbol: item.purchaseUnitSymbol,
      conversionFactorToBase: Number(item.conversionFactor),
      baseUnitSymbol: item.purchaseUnitSymbol, // Will be enriched/validated by reconciliation
      orderedQty: String(item.orderedQty),
      expectedCostUnitNet: String(item.expectedCostUnitNet),
    })),
  };
}

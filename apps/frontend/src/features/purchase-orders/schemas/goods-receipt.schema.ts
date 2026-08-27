import { z } from 'zod';
import Decimal from 'decimal.js';
import type {
  ICreateGoodsReceiptPayload,
  IGoodsReceiptFormData,
  IPurchaseOrderDetail,
} from '../types/purchase-orders.types';
import { calculateGoodsReceiptBaseMovement } from '../utils/goods-receipt.math';

const DECIMAL_PATTERN = /^\d+(\.\d{1,4})?$/;
const DELIVERY_NOTE_PATTERN = /^[A-Za-z0-9 _/.\-]+$/;

const calculationMessages = {
  INVALID_QUANTITY: 'La cantidad debe ser positiva y tener hasta 4 decimales.',
  INVALID_FACTOR: 'El factor de conversión de la orden no es válido.',
  EXCEEDS_PENDING: 'La cantidad supera el saldo pendiente.',
  NOT_REPRESENTABLE: 'La cantidad no genera al menos 0,01 unidades base de stock.',
  RESIDUAL_NOT_REPRESENTABLE:
    'La recepción dejaría un saldo demasiado pequeño. Reciba esta cantidad junto con el saldo restante.',
  OVERFLOW: 'La cantidad convertida supera el máximo admitido por el inventario.',
} as const;

const formItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  receivedQtyPurchaseUnit: z.string(),
  provisionalCostUnitNet: z.string(),
});

export function createGoodsReceiptFormSchema(order: IPurchaseOrderDetail) {
  const orderItems = new Map(order.items.map((item) => [item.id, item]));

  return z
    .object({
      deliveryNoteNumber: z
        .string()
        .trim()
        .min(1, 'El número de remito es obligatorio.')
        .max(50, 'El número de remito no puede superar los 50 caracteres.')
        .regex(
          DELIVERY_NOTE_PATTERN,
          'Use solamente letras, números, espacios, guiones, barras, puntos o guion bajo.',
        ),
      items: z.array(formItemSchema),
    })
    .superRefine((data, context) => {
      let activeItems = 0;
      const seenIds = new Set<string>();

      data.items.forEach((formItem, index) => {
        const quantity = formItem.receivedQtyPurchaseUnit.trim();
        const orderItem = orderItems.get(formItem.purchaseOrderItemId);

        if (seenIds.has(formItem.purchaseOrderItemId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'purchaseOrderItemId'],
            message: 'La línea está duplicada.',
          });
          return;
        }
        seenIds.add(formItem.purchaseOrderItemId);

        if (!orderItem) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'purchaseOrderItemId'],
            message: 'La línea no pertenece a la orden cargada.',
          });
          return;
        }

        if (quantity === '') return;
        activeItems += 1;

        if (!DECIMAL_PATTERN.test(quantity)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'receivedQtyPurchaseUnit'],
            message: 'Ingrese una cantidad positiva con hasta 4 decimales.',
          });
          return;
        }

        const quantityDecimal = new Decimal(quantity);
        if (quantityDecimal.lte(0) || quantityDecimal.gt('99999999.9999')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'receivedQtyPurchaseUnit'],
            message: 'La cantidad debe estar entre 0,0001 y 99.999.999,9999.',
          });
          return;
        }

        const cost = formItem.provisionalCostUnitNet.trim();
        if (!DECIMAL_PATTERN.test(cost)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'provisionalCostUnitNet'],
            message: 'Ingrese un costo no negativo con hasta 4 decimales.',
          });
        } else {
          const costDecimal = new Decimal(cost);
          if (costDecimal.lt(0) || costDecimal.gt('99999999.9999')) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['items', index, 'provisionalCostUnitNet'],
              message: 'El costo debe estar entre 0 y 99.999.999,9999.',
            });
          }
        }

        const calculation = calculateGoodsReceiptBaseMovement({
          orderedQty: orderItem.orderedQty,
          conversionFactor: orderItem.conversionFactor,
          previousReceivedPurchaseQty: orderItem.receivedQty,
          deltaPurchaseQty: quantity,
        });
        if (!calculation.valid) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['items', index, 'receivedQtyPurchaseUnit'],
            message: calculationMessages[calculation.code],
          });
        }
      });

      if (activeItems === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'Ingrese una cantidad a recibir en al menos una línea.',
        });
      }
    });
}

export function buildGoodsReceiptInitialValues(order: IPurchaseOrderDetail): IGoodsReceiptFormData {
  return {
    deliveryNoteNumber: '',
    items: order.items
      .filter((item) => new Decimal(item.pendingQty).gt(0))
      .map((item) => ({
        purchaseOrderItemId: item.id,
        receivedQtyPurchaseUnit: '',
        provisionalCostUnitNet: item.expectedCostUnitNet,
      })),
  };
}

export function mapGoodsReceiptFormToPayload(
  data: IGoodsReceiptFormData,
): ICreateGoodsReceiptPayload {
  return {
    deliveryNoteNumber: data.deliveryNoteNumber.trim(),
    items: data.items
      .filter((item) => item.receivedQtyPurchaseUnit.trim() !== '')
      .map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        receivedQtyPurchaseUnit: new Decimal(item.receivedQtyPurchaseUnit).toNumber(),
        provisionalCostUnitNet: new Decimal(item.provisionalCostUnitNet).toNumber(),
      })),
  };
}

export type GoodsReceiptFormSchema = ReturnType<typeof createGoodsReceiptFormSchema>;

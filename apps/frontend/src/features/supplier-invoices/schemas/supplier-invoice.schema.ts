import { z } from 'zod';
import Decimal from 'decimal.js';
import type {
  ICreateSupplierInvoicePayload,
  IPendingInvoiceReceipt,
  SupplierInvoiceFormData,
} from '../types/supplier-invoices.types';
import { SupplierInvoiceAdjustmentMode } from '../types/supplier-invoices.types';
import {
  argentinaToday,
  calculateInvoiceLine,
  ZERO_DECIMAL,
} from '../utils/supplier-invoices.math';

const DECIMAL = /^\d{1,20}(?:\.\d{1,4})?$/;
const POSITIVE_DECIMAL = /^(?!0+(?:\.0+)?$)\d{1,20}(?:\.\d{1,4})?$/;
const MAX_LINE_VALUE = new Decimal('99999999.9999');

const lineSchema = z.object({
  goodsReceiptItemId: z.string().uuid(),
  invoicedQtyPurchaseUnit: z.string(),
  unitPriceNet: z.string(),
  discountNet: z.string(),
  bonusNet: z.string(),
  surchargeNet: z.string(),
  discountMode: z.nativeEnum(SupplierInvoiceAdjustmentMode),
  bonusMode: z.nativeEnum(SupplierInvoiceAdjustmentMode),
  surchargeMode: z.nativeEnum(SupplierInvoiceAdjustmentMode),
});

export function createSupplierInvoiceSchema(receipt: IPendingInvoiceReceipt) {
  const receiptItems = new Map(receipt.items.map((item) => [item.goodsReceiptItemId, item]));
  return z
    .object({
      invoiceNumber: z
        .string()
        .trim()
        .min(1, 'Ingrese el número de comprobante.')
        .max(50, 'El comprobante no puede superar 50 caracteres.')
        .refine(
          (value) => !/[\x00-\x1f\x7f]/.test(value),
          'El comprobante contiene caracteres inválidos.',
        ),
      invoiceDate: z.string().refine((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }, 'Ingrese una fecha válida.'),
      taxTotal: z.string().regex(DECIMAL, 'El IVA debe ser no negativo y tener hasta 4 decimales.'),
      taxMode: z.nativeEnum(SupplierInvoiceAdjustmentMode),
      items: z.array(lineSchema),
    })
    .superRefine((data, context) => {
      if (
        data.taxMode === SupplierInvoiceAdjustmentMode.PERCENTAGE &&
        DECIMAL.test(data.taxTotal) &&
        new Decimal(data.taxTotal).gt(100)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['taxTotal'],
          message: 'El porcentaje de IVA debe estar entre 0 y 100.',
        });
      }
      let selected = 0;
      data.items.forEach((line, index) => {
        const quantity = line.invoicedQtyPurchaseUnit.trim();
        if (!quantity) return;
        selected += 1;
        if (!POSITIVE_DECIMAL.test(quantity)) {
          context.addIssue({
            code: 'custom',
            path: ['items', index, 'invoicedQtyPurchaseUnit'],
            message: 'Ingrese una cantidad positiva con hasta 4 decimales.',
          });
          return;
        }
        if (new Decimal(quantity).gt(MAX_LINE_VALUE)) {
          context.addIssue({
            code: 'custom',
            path: ['items', index, 'invoicedQtyPurchaseUnit'],
            message: 'La cantidad supera el máximo permitido.',
          });
        }
        const amountFields = ['unitPriceNet', 'discountNet', 'bonusNet', 'surchargeNet'] as const;
        amountFields.forEach((field) => {
          if (!DECIMAL.test(line[field])) {
            context.addIssue({
              code: 'custom',
              path: ['items', index, field],
              message: 'Ingrese un importe no negativo con hasta 4 decimales.',
            });
          }
        });
        const modeByField = {
          discountNet: line.discountMode,
          bonusNet: line.bonusMode,
          surchargeNet: line.surchargeMode,
          unitPriceNet: SupplierInvoiceAdjustmentMode.AMOUNT,
        } as const;
        amountFields.forEach((field) => {
          if (
            field !== 'unitPriceNet' &&
            modeByField[field] === SupplierInvoiceAdjustmentMode.PERCENTAGE &&
            DECIMAL.test(line[field]) &&
            new Decimal(line[field]).gt(100)
          ) {
            context.addIssue({
              code: 'custom',
              path: ['items', index, field],
              message: 'El porcentaje debe estar entre 0 y 100.',
            });
          }
        });
        if (DECIMAL.test(line.unitPriceNet) && new Decimal(line.unitPriceNet).gt(MAX_LINE_VALUE)) {
          context.addIssue({
            code: 'custom',
            path: ['items', index, 'unitPriceNet'],
            message: 'El precio unitario supera el máximo permitido.',
          });
        }
        const receiptItem = receiptItems.get(line.goodsReceiptItemId);
        if (receiptItem && amountFields.every((field) => DECIMAL.test(line[field]))) {
          const calculation = calculateInvoiceLine({
            quantity,
            available: receiptItem.availableQtyPurchaseUnit,
            unitPrice: line.unitPriceNet,
            discount: line.discountNet,
            bonus: line.bonusNet,
            surcharge: line.surchargeNet,
            discountMode: line.discountMode,
            bonusMode: line.bonusMode,
            surchargeMode: line.surchargeMode,
          });
          if (calculation.net.isNegative()) {
            context.addIssue({
              code: 'custom',
              path: ['items', index, 'discountNet'],
              message: 'Descuentos y bonificaciones no pueden producir un neto negativo.',
            });
          }
        }
      });
      if (selected === 0) {
        context.addIssue({
          code: 'custom',
          path: ['items'],
          message: 'Ingrese cantidad en al menos una línea.',
        });
      }
    });
}

export function buildSupplierInvoiceDefaults(
  receipt: IPendingInvoiceReceipt,
): SupplierInvoiceFormData {
  return {
    invoiceNumber: '',
    invoiceDate: argentinaToday(),
    taxTotal: ZERO_DECIMAL,
    taxMode: SupplierInvoiceAdjustmentMode.AMOUNT,
    items: receipt.items.map((item) => ({
      goodsReceiptItemId: item.goodsReceiptItemId,
      invoicedQtyPurchaseUnit: '',
      unitPriceNet: new Decimal(item.provisionalCostUnitNet).toFixed(4),
      discountNet: ZERO_DECIMAL,
      bonusNet: ZERO_DECIMAL,
      surchargeNet: ZERO_DECIMAL,
      discountMode: SupplierInvoiceAdjustmentMode.AMOUNT,
      bonusMode: SupplierInvoiceAdjustmentMode.AMOUNT,
      surchargeMode: SupplierInvoiceAdjustmentMode.AMOUNT,
    })),
  };
}

const canonical = (value: string) => new Decimal(value).toFixed(4);

export function mapSupplierInvoiceFormToPayload(
  receipt: IPendingInvoiceReceipt,
  data: SupplierInvoiceFormData,
): ICreateSupplierInvoicePayload {
  return {
    goodsReceiptId: receipt.id,
    invoiceNumber: data.invoiceNumber.trim(),
    invoiceDate: data.invoiceDate,
    taxTotal:
      data.taxMode === SupplierInvoiceAdjustmentMode.AMOUNT
        ? canonical(data.taxTotal)
        : ZERO_DECIMAL,
    taxMode: data.taxMode,
    taxPercentage:
      data.taxMode === SupplierInvoiceAdjustmentMode.PERCENTAGE
        ? canonical(data.taxTotal)
        : undefined,
    items: data.items
      .filter((item) => item.invoicedQtyPurchaseUnit.trim() !== '')
      .map((item) => ({
        goodsReceiptItemId: item.goodsReceiptItemId,
        invoicedQtyPurchaseUnit: canonical(item.invoicedQtyPurchaseUnit),
        unitPriceNet: canonical(item.unitPriceNet),
        discountNet:
          item.discountMode === SupplierInvoiceAdjustmentMode.AMOUNT
            ? canonical(item.discountNet)
            : ZERO_DECIMAL,
        discountMode: item.discountMode,
        discountPercentage:
          item.discountMode === SupplierInvoiceAdjustmentMode.PERCENTAGE
            ? canonical(item.discountNet)
            : undefined,
        bonusNet:
          item.bonusMode === SupplierInvoiceAdjustmentMode.AMOUNT
            ? canonical(item.bonusNet)
            : ZERO_DECIMAL,
        bonusMode: item.bonusMode,
        bonusPercentage:
          item.bonusMode === SupplierInvoiceAdjustmentMode.PERCENTAGE
            ? canonical(item.bonusNet)
            : undefined,
        surchargeNet:
          item.surchargeMode === SupplierInvoiceAdjustmentMode.AMOUNT
            ? canonical(item.surchargeNet)
            : ZERO_DECIMAL,
        surchargeMode: item.surchargeMode,
        surchargePercentage:
          item.surchargeMode === SupplierInvoiceAdjustmentMode.PERCENTAGE
            ? canonical(item.surchargeNet)
            : undefined,
      })),
  };
}

import { BadRequestException, ConflictException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceQuantityStatus,
} from '@erp/shared-types';

const MAX_QUANTITY = new Decimal('99999999.9999');
const MAX_UNIT_COST = new Decimal('99999999.9999');
const MAX_TOTAL = new Decimal('99999999999999999999.9999');

function decimalOrThrow(
  value: string | number,
  code: SupplierInvoiceErrorCode,
  message: string,
): Decimal {
  let decimal: Decimal;
  try {
    decimal = new Decimal(value);
  } catch {
    throw new BadRequestException({ code, message });
  }
  if (!decimal.isFinite()) {
    throw new BadRequestException({ code, message });
  }
  return decimal;
}

export interface SupplierInvoiceAmountsInput {
  invoicedQty: string | number;
  unitPriceNet: string | number;
  discountNet?: string | number;
  bonusNet?: string | number;
  surchargeNet?: string | number;
  discountMode?: SupplierInvoiceAdjustmentMode;
  discountPercentage?: string | number;
  bonusMode?: SupplierInvoiceAdjustmentMode;
  bonusPercentage?: string | number;
  surchargeMode?: SupplierInvoiceAdjustmentMode;
  surchargePercentage?: string | number;
}

export interface SupplierInvoiceAmountsResult {
  unitPriceNet: string;
  discountNet: string;
  bonusNet: string;
  surchargeNet: string;
  realCostUnitNet: string;
  lineNetTotal: string;
  discountMode: SupplierInvoiceAdjustmentMode;
  discountPercentage: string | null;
  bonusMode: SupplierInvoiceAdjustmentMode;
  bonusPercentage: string | null;
  surchargeMode: SupplierInvoiceAdjustmentMode;
  surchargePercentage: string | null;
}

export function calculateSupplierInvoiceAmounts(
  input: SupplierInvoiceAmountsInput,
): SupplierInvoiceAmountsResult {
  const quantity = decimalOrThrow(
    input.invoicedQty,
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_QUANTITY,
    'La cantidad facturada debe ser un decimal positivo con hasta 4 decimales.',
  );
  if (
    quantity.lte(0) ||
    quantity.decimalPlaces() > 4 ||
    quantity.gt(MAX_QUANTITY)
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_QUANTITY,
      message:
        'La cantidad facturada debe ser un decimal positivo con hasta 4 decimales.',
    });
  }

  const unitPrice = decimalOrThrow(
    input.unitPriceNet,
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );
  const discountInput = decimalOrThrow(
    input.discountNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );
  const bonusInput = decimalOrThrow(
    input.bonusNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );
  const surchargeInput = decimalOrThrow(
    input.surchargeNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );

  if (
    [unitPrice, discountInput, bonusInput, surchargeInput].some(
      (value) => value.isNegative() || value.decimalPlaces() > 4,
    ) ||
    unitPrice.gt(MAX_UNIT_COST) ||
    [discountInput, bonusInput, surchargeInput].some((value) =>
      value.gt(MAX_TOTAL),
    )
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
      message:
        'Los importes de la factura deben ser decimales no negativos con hasta 4 decimales.',
    });
  }

  const gross = quantity
    .times(unitPrice)
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  const adjustment = (
    mode: SupplierInvoiceAdjustmentMode | undefined,
    amount: Decimal,
    percentageValue: string | number | undefined,
  ): {
    amount: Decimal;
    mode: SupplierInvoiceAdjustmentMode;
    percentage: string | null;
  } => {
    const resolvedMode = mode ?? SupplierInvoiceAdjustmentMode.AMOUNT;
    if (resolvedMode === SupplierInvoiceAdjustmentMode.AMOUNT) {
      return { amount, mode: resolvedMode, percentage: null };
    }
    const percentage = decimalOrThrow(
      percentageValue ?? '-1',
      SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
      'Los porcentajes deben estar entre 0 y 100 con hasta 4 decimales.',
    );
    if (
      percentage.lt(0) ||
      percentage.gt(100) ||
      percentage.decimalPlaces() > 4
    ) {
      throw new BadRequestException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
        message:
          'Los porcentajes deben estar entre 0 y 100 con hasta 4 decimales.',
      });
    }
    return {
      amount: gross
        .times(percentage)
        .dividedBy(100)
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP),
      mode: resolvedMode,
      percentage: percentage.toFixed(4),
    };
  };
  const discount = adjustment(
    input.discountMode,
    discountInput,
    input.discountPercentage,
  );
  const bonus = adjustment(input.bonusMode, bonusInput, input.bonusPercentage);
  const surcharge = adjustment(
    input.surchargeMode,
    surchargeInput,
    input.surchargePercentage,
  );
  const lineNetTotal = gross
    .minus(discount.amount)
    .minus(bonus.amount)
    .plus(surcharge.amount)
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

  if (lineNetTotal.isNegative() || lineNetTotal.gt(MAX_TOTAL)) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
      message:
        'Los descuentos y bonificaciones no pueden producir un total neto negativo.',
    });
  }

  return {
    unitPriceNet: unitPrice.toFixed(4),
    discountNet: discount.amount.toFixed(4),
    bonusNet: bonus.amount.toFixed(4),
    surchargeNet: surcharge.amount.toFixed(4),
    discountMode: discount.mode,
    discountPercentage: discount.percentage,
    bonusMode: bonus.mode,
    bonusPercentage: bonus.percentage,
    surchargeMode: surcharge.mode,
    surchargePercentage: surcharge.percentage,
    realCostUnitNet: lineNetTotal
      .dividedBy(quantity)
      .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
      .toFixed(4),
    lineNetTotal: lineNetTotal.toFixed(4),
  };
}

export interface SupplierInvoiceAllocationInput {
  receivedQtyPurchaseUnit: string | number;
  receivedQtyBase: string | number;
  previouslyAllocatedQtyPurchaseUnit: string | number;
  previouslyAllocatedQtyBase: string | number;
  invoicedQtyPurchaseUnit: string | number;
}

export interface SupplierInvoiceAllocationResult {
  previouslyAllocatedQtyPurchaseUnit: string;
  availableQtyBefore: string;
  allocatedReceivedQtyPurchaseUnit: string;
  allocatedReceivedQtyBase: string;
  pendingQtyAfter: string;
  quantityExcess: string;
  quantityStatus: SupplierInvoiceQuantityStatus;
}

export function calculateSupplierInvoiceAllocation(
  input: SupplierInvoiceAllocationInput,
): SupplierInvoiceAllocationResult {
  const received = new Decimal(input.receivedQtyPurchaseUnit);
  const receivedBase = new Decimal(input.receivedQtyBase);
  const previousAllocated = new Decimal(
    input.previouslyAllocatedQtyPurchaseUnit || 0,
  );
  const previousAllocatedBase = new Decimal(
    input.previouslyAllocatedQtyBase || 0,
  );
  const invoiced = new Decimal(input.invoicedQtyPurchaseUnit);

  if (
    !received.isFinite() ||
    !receivedBase.isFinite() ||
    !previousAllocated.isFinite() ||
    !previousAllocatedBase.isFinite() ||
    !invoiced.isFinite() ||
    received.lte(0) ||
    receivedBase.lte(0) ||
    previousAllocated.isNegative() ||
    previousAllocatedBase.isNegative() ||
    previousAllocated.gt(received) ||
    previousAllocatedBase.gt(receivedBase)
  ) {
    throw new ConflictException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ALLOCATION_INCONSISTENT,
      message:
        'Las cantidades previamente conciliadas no son consistentes con la recepción.',
    });
  }

  if (
    invoiced.lte(0) ||
    invoiced.decimalPlaces() > 4 ||
    invoiced.gt(MAX_QUANTITY)
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_QUANTITY,
      message:
        'La cantidad facturada debe ser un decimal positivo con hasta 4 decimales.',
    });
  }

  const available = received.minus(previousAllocated);
  const allocated = Decimal.min(invoiced, available);
  const newAllocated = previousAllocated.plus(allocated);
  const targetBase = newAllocated.eq(received)
    ? receivedBase
    : receivedBase
        .times(newAllocated)
        .dividedBy(received)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const allocatedBase = targetBase.minus(previousAllocatedBase);

  if (allocatedBase.isNegative()) {
    throw new ConflictException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ALLOCATION_INCONSISTENT,
      message:
        'La asignación en unidad base no es consistente con facturas anteriores.',
    });
  }

  const excess = Decimal.max(invoiced.minus(available), 0);
  const pending = received.minus(newAllocated);
  const quantityStatus = excess.gt(0)
    ? SupplierInvoiceQuantityStatus.EXCEDIDA
    : pending.gt(0)
      ? SupplierInvoiceQuantityStatus.PARCIAL
      : SupplierInvoiceQuantityStatus.EXACTA;

  return {
    previouslyAllocatedQtyPurchaseUnit: previousAllocated.toFixed(4),
    availableQtyBefore: available.toFixed(4),
    allocatedReceivedQtyPurchaseUnit: allocated.toFixed(4),
    allocatedReceivedQtyBase: allocatedBase.toFixed(2),
    pendingQtyAfter: pending.toFixed(4),
    quantityExcess: excess.toFixed(4),
    quantityStatus,
  };
}

export function normalizeSupplierInvoiceTaxTotal(value: string): string {
  const tax = decimalOrThrow(
    value,
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX,
    'El IVA total debe ser un decimal no negativo con hasta 4 decimales.',
  );
  if (tax.isNegative() || tax.decimalPlaces() > 4 || tax.gt(MAX_TOTAL)) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX,
      message:
        'El IVA total debe ser un decimal no negativo con hasta 4 decimales.',
    });
  }
  return tax.toFixed(4);
}

export function calculateSupplierInvoiceTax(input: {
  netTotal: Decimal;
  taxTotal: string;
  taxMode?: SupplierInvoiceAdjustmentMode;
  taxPercentage?: string;
}): {
  taxTotal: string;
  taxMode: SupplierInvoiceAdjustmentMode;
  taxPercentage: string | null;
} {
  const mode = input.taxMode ?? SupplierInvoiceAdjustmentMode.AMOUNT;
  if (mode === SupplierInvoiceAdjustmentMode.AMOUNT) {
    return {
      taxTotal: normalizeSupplierInvoiceTaxTotal(input.taxTotal),
      taxMode: mode,
      taxPercentage: null,
    };
  }
  const percentage = decimalOrThrow(
    input.taxPercentage ?? '-1',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX,
    'El porcentaje de IVA debe estar entre 0 y 100 con hasta 4 decimales.',
  );
  if (
    percentage.lt(0) ||
    percentage.gt(100) ||
    percentage.decimalPlaces() > 4
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX,
      message:
        'El porcentaje de IVA debe estar entre 0 y 100 con hasta 4 decimales.',
    });
  }
  return {
    taxTotal: input.netTotal
      .times(percentage)
      .dividedBy(100)
      .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
      .toFixed(4),
    taxMode: mode,
    taxPercentage: percentage.toFixed(4),
  };
}

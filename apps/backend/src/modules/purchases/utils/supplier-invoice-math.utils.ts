import { BadRequestException, ConflictException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  SupplierInvoiceErrorCode,
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
}

export interface SupplierInvoiceAmountsResult {
  unitPriceNet: string;
  discountNet: string;
  bonusNet: string;
  surchargeNet: string;
  realCostUnitNet: string;
  lineNetTotal: string;
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
  const discount = decimalOrThrow(
    input.discountNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );
  const bonus = decimalOrThrow(
    input.bonusNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );
  const surcharge = decimalOrThrow(
    input.surchargeNet ?? '0',
    SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
    'Los importes de la factura deben ser decimales no negativos.',
  );

  if (
    [unitPrice, discount, bonus, surcharge].some(
      (value) => value.isNegative() || value.decimalPlaces() > 4,
    ) ||
    unitPrice.gt(MAX_UNIT_COST) ||
    [discount, bonus, surcharge].some((value) => value.gt(MAX_TOTAL))
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
      message:
        'Los importes de la factura deben ser decimales no negativos con hasta 4 decimales.',
    });
  }

  const lineNetTotal = quantity
    .times(unitPrice)
    .minus(discount)
    .minus(bonus)
    .plus(surcharge)
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
    discountNet: discount.toFixed(4),
    bonusNet: bonus.toFixed(4),
    surchargeNet: surcharge.toFixed(4),
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

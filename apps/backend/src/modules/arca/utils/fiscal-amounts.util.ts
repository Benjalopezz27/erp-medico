import {
  FiscalAmounts,
  FiscalIvaBreakdown,
  ProductTaxTreatment,
} from '@erp/shared-types';
import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

type FiscalLineSnapshot = {
  taxTreatment: ProductTaxTreatment;
  subtotalNet: string | number;
  ivaPercentage: string | number | null;
  ivaAmount: string | number;
};

const ARCA_RATE_IDS = new Map<string, FiscalIvaBreakdown['arcaRateId']>([
  ['0.00', 3],
  ['10.50', 4],
  ['21.00', 5],
  ['27.00', 6],
  ['5.00', 8],
  ['2.50', 9],
]);

const money = (value: Decimal.Value): Decimal =>
  new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function buildFiscalAmounts(lines: FiscalLineSnapshot[]): FiscalAmounts {
  let taxableNet = new Decimal(0);
  let exemptAmount = new Decimal(0);
  let nonTaxedAmount = new Decimal(0);
  let ivaAmount = new Decimal(0);
  const groups = new Map<string, { taxableBase: Decimal; amount: Decimal }>();

  for (const line of lines) {
    const subtotal = money(line.subtotalNet);
    const lineIva = money(line.ivaAmount);
    if (line.taxTreatment === ProductTaxTreatment.GRAVADO) {
      if (line.ivaPercentage === null) {
        throw new BadRequestException(
          'Una línea gravada debe informar su alícuota de IVA.',
        );
      }
      const rate = new Decimal(line.ivaPercentage).toFixed(2);
      if (!ARCA_RATE_IDS.has(rate)) {
        throw new BadRequestException(
          `La alícuota ${rate}% no tiene mapeo ARCA.`,
        );
      }
      const group = groups.get(rate) ?? {
        taxableBase: new Decimal(0),
        amount: new Decimal(0),
      };
      group.taxableBase = group.taxableBase.plus(subtotal);
      group.amount = group.amount.plus(lineIva);
      groups.set(rate, group);
      taxableNet = taxableNet.plus(subtotal);
      ivaAmount = ivaAmount.plus(lineIva);
    } else if (line.taxTreatment === ProductTaxTreatment.EXENTO) {
      exemptAmount = exemptAmount.plus(subtotal);
    } else {
      nonTaxedAmount = nonTaxedAmount.plus(subtotal);
    }
  }

  const ivaBreakdown = [...groups.entries()]
    .sort(([left], [right]) => new Decimal(left).cmp(right))
    .map(([rate, values]) => ({
      arcaRateId: ARCA_RATE_IDS.get(rate)!,
      percentage: Number(rate),
      taxableBase: money(values.taxableBase).toNumber(),
      amount: money(values.amount).toNumber(),
    }));
  const totalAmount = taxableNet
    .plus(exemptAmount)
    .plus(nonTaxedAmount)
    .plus(ivaAmount);

  return {
    taxableNetAmount: money(taxableNet).toNumber(),
    exemptAmount: money(exemptAmount).toNumber(),
    nonTaxedAmount: money(nonTaxedAmount).toNumber(),
    ivaAmount: money(ivaAmount).toNumber(),
    totalAmount: money(totalAmount).toNumber(),
    ivaBreakdown,
  };
}

export function validateFiscalAmounts(data: FiscalAmounts): void {
  for (const item of data.ivaBreakdown) {
    const rate = new Decimal(item.percentage).toFixed(2);
    if (ARCA_RATE_IDS.get(rate) !== item.arcaRateId) {
      throw new BadRequestException(
        `La alícuota ${rate}% no coincide con el identificador ARCA informado.`,
      );
    }
    if (
      new Decimal(item.taxableBase).isNegative() ||
      new Decimal(item.amount).isNegative()
    ) {
      throw new BadRequestException(
        'Las bases e importes de IVA no pueden ser negativos.',
      );
    }
  }
  const expectedTotal = money(data.taxableNetAmount)
    .plus(data.exemptAmount)
    .plus(data.nonTaxedAmount)
    .plus(data.ivaAmount);
  const breakdownBase = data.ivaBreakdown.reduce(
    (total, item) => total.plus(item.taxableBase),
    new Decimal(0),
  );
  const breakdownIva = data.ivaBreakdown.reduce(
    (total, item) => total.plus(item.amount),
    new Decimal(0),
  );

  if (!money(data.totalAmount).eq(money(expectedTotal))) {
    throw new BadRequestException(
      'El total fiscal no coincide con la suma de sus componentes.',
    );
  }
  if (!money(data.taxableNetAmount).eq(money(breakdownBase))) {
    throw new BadRequestException(
      'El neto gravado no coincide con las bases por alícuota.',
    );
  }
  if (!money(data.ivaAmount).eq(money(breakdownIva))) {
    throw new BadRequestException(
      'El IVA total no coincide con el desglose por alícuota.',
    );
  }
}

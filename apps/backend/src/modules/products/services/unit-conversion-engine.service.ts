import { Injectable, BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Product } from '../entities/product.entity';

export interface ConvertedQuantityResult {
  productId: string;
  presentationUnitId: string;
  presentationQuantity: number;
  baseUnitId: string;
  baseQuantity: number;
  conversionFactor: number;
  isBaseUnit: boolean;
}

@Injectable()
export class UnitConversionEngine {
  private static readonly QUANTITY_SCALE = 4;
  private static readonly MAX_QUANTITY = new Decimal('99999999999999.9999');

  /**
   * Authoritatively converts a quantity from a presentation unit to product base units.
   * - If unitId === product.baseUnitId, applies implicit factor 1.0000.
   * - If conversion exists, computes: presentationQuantity * conversionFactor.
   * - If conversion does not exist, throws BadRequestException.
   */
  convertToBase(
    product: Product,
    presentationUnitId: string,
    presentationQuantity: number | string | Decimal,
  ): ConvertedQuantityResult {
    let qty: Decimal;
    try {
      qty = new Decimal(presentationQuantity);
    } catch {
      throw new BadRequestException(
        'La cantidad a convertir debe ser un número válido.',
      );
    }

    if (!qty.isFinite() || qty.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'La cantidad a convertir debe ser un número positivo mayor que cero.',
      );
    }

    if (
      qty.decimalPlaces() > UnitConversionEngine.QUANTITY_SCALE ||
      qty.greaterThan(UnitConversionEngine.MAX_QUANTITY)
    ) {
      throw new BadRequestException(
        'La cantidad a convertir admite hasta 4 decimales y no puede exceder 99999999999999.9999.',
      );
    }

    // Case 1: Base Unit (implicit factor 1)
    if (presentationUnitId === product.baseUnitId) {
      return {
        productId: product.id,
        presentationUnitId,
        presentationQuantity: qty.toNumber(),
        baseUnitId: product.baseUnitId,
        baseQuantity: qty
          .toDecimalPlaces(
            UnitConversionEngine.QUANTITY_SCALE,
            Decimal.ROUND_HALF_UP,
          )
          .toNumber(),
        conversionFactor: 1,
        isBaseUnit: true,
      };
    }

    // Case 2: Configured Presentation Unit Conversion
    const conversion = product.conversions?.find(
      (c) => c.presentationUnitId === presentationUnitId,
    );

    if (!conversion) {
      throw new BadRequestException(
        `No existe una regla de conversión configurada para la unidad especificada en el producto "${product.name}".`,
      );
    }

    const factor = new Decimal(conversion.conversionFactor);
    const baseQty = qty
      .times(factor)
      .toDecimalPlaces(
        UnitConversionEngine.QUANTITY_SCALE,
        Decimal.ROUND_HALF_UP,
      );

    if (
      !baseQty.isFinite() ||
      baseQty.greaterThan(UnitConversionEngine.MAX_QUANTITY)
    ) {
      throw new BadRequestException(
        'La cantidad resultante excede el máximo admitido de 99999999999999.9999 unidades base.',
      );
    }

    return {
      productId: product.id,
      presentationUnitId,
      presentationQuantity: qty.toNumber(),
      baseUnitId: product.baseUnitId,
      baseQuantity: baseQty.toNumber(),
      conversionFactor: factor.toNumber(),
      isBaseUnit: false,
    };
  }

  /**
   * Authoritatively computes suggested price net:
   * suggestedPriceNet = costNet * (1 + markupPercentage / 100)
   * Rounded to 2 decimal places using ROUND_HALF_UP.
   */
  calculateSuggestedPrice(
    costNet: number | string | Decimal,
    markupPercentage?: number | string | Decimal | null,
  ): number {
    const cost = new Decimal(costNet || 0);
    if (cost.lessThanOrEqualTo(0)) {
      return 0;
    }

    if (
      markupPercentage === undefined ||
      markupPercentage === null ||
      markupPercentage === ''
    ) {
      return cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    const markup = new Decimal(markupPercentage);
    if (markup.lessThanOrEqualTo(0)) {
      return cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    const multiplier = new Decimal(1).plus(markup.dividedBy(100));
    return cost
      .times(multiplier)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
  }
}

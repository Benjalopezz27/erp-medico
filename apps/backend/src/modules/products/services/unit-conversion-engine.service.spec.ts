import { BadRequestException } from '@nestjs/common';
import { UnitConversionEngine } from './unit-conversion-engine.service';
import { Product } from '../entities/product.entity';
import { ProductUnitConversion } from '../entities/product-unit-conversion.entity';

describe('UnitConversionEngine', () => {
  let engine: UnitConversionEngine;

  const mockProduct = {
    id: 'p-1',
    name: 'Ibuprofeno 400mg',
    baseUnitId: 'u-base',
    conversions: [
      {
        id: 'c-box',
        productId: 'p-1',
        presentationUnitId: 'u-box',
        conversionFactor: '100.0000',
      } as ProductUnitConversion,
      {
        id: 'c-master',
        productId: 'p-1',
        presentationUnitId: 'u-master',
        conversionFactor: '1200.0000',
      } as ProductUnitConversion,
      {
        id: 'c-strip',
        productId: 'p-1',
        presentationUnitId: 'u-strip',
        conversionFactor: '10.0000',
      } as ProductUnitConversion,
    ],
  } as Product;

  beforeEach(() => {
    engine = new UnitConversionEngine();
  });

  describe('convertToBase', () => {
    it('converts base unit with implicit factor 1', () => {
      const result = engine.convertToBase(mockProduct, 'u-base', 25);
      expect(result.isBaseUnit).toBe(true);
      expect(result.conversionFactor).toBe(1);
      expect(result.baseQuantity).toBe(25);
      expect(result.presentationQuantity).toBe(25);
    });

    it('converts presentation unit correctly using configured factor', () => {
      const result = engine.convertToBase(mockProduct, 'u-box', 5);
      expect(result.isBaseUnit).toBe(false);
      expect(result.conversionFactor).toBe(100);
      expect(result.baseQuantity).toBe(500);
    });

    it('handles decimal presentation quantities and rounding', () => {
      const result = engine.convertToBase(mockProduct, 'u-strip', 2.5);
      expect(result.baseQuantity).toBe(25);
    });

    it('throws BadRequestException on unconfigured presentation unit', () => {
      expect(() =>
        engine.convertToBase(mockProduct, 'u-unconfigured', 10),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException on zero or negative quantities', () => {
      expect(() => engine.convertToBase(mockProduct, 'u-box', 0)).toThrow(
        BadRequestException,
      );
      expect(() => engine.convertToBase(mockProduct, 'u-box', -5)).toThrow(
        BadRequestException,
      );
      expect(() =>
        engine.convertToBase(mockProduct, 'u-box', 'invalid'),
      ).toThrow(BadRequestException);
    });

    it('rejects quantities outside the documented precision and range', () => {
      expect(() =>
        engine.convertToBase(mockProduct, 'u-box', '1.00001'),
      ).toThrow(BadRequestException);
      expect(() =>
        engine.convertToBase(mockProduct, 'u-base', '100000000000000'),
      ).toThrow(BadRequestException);
      expect(() =>
        engine.convertToBase(mockProduct, 'u-master', '99999999999999.9999'),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('calculates suggested price with cost and markup', () => {
      // 100 * (1 + 35 / 100) = 135
      expect(engine.calculateSuggestedPrice(100, 35)).toBe(135);

      // 1500.50 * (1 + 30 / 100) = 1950.65
      expect(engine.calculateSuggestedPrice(1500.5, 30)).toBe(1950.65);
    });

    it('applies standard half-up commercial rounding to 2 decimal places', () => {
      // 10.555 * (1 + 10 / 100) = 11.6105 -> 11.61
      expect(engine.calculateSuggestedPrice('10.555', 10)).toBe(11.61);

      // 10.5555 * (1 + 10 / 100) = 11.61105 -> 11.61
      expect(engine.calculateSuggestedPrice('10.5555', 10)).toBe(11.61);
    });

    it('returns rounded cost when markup is null, undefined, or 0', () => {
      expect(engine.calculateSuggestedPrice(250.756, null)).toBe(250.76);
      expect(engine.calculateSuggestedPrice(250.756, undefined)).toBe(250.76);
      expect(engine.calculateSuggestedPrice(250.756, 0)).toBe(250.76);
    });

    it('returns 0 when cost is zero or negative', () => {
      expect(engine.calculateSuggestedPrice(0, 50)).toBe(0);
      expect(engine.calculateSuggestedPrice(-10, 50)).toBe(0);
    });
  });
});

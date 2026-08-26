import { ImporterRowValidatorService } from './importer-row-validator.service';
import { ImporterRowErrorCode } from '@erp/shared-types';

describe('ImporterRowValidatorService', () => {
  let service: ImporterRowValidatorService;

  beforeEach(() => {
    service = new ImporterRowValidatorService();
  });

  describe('normalizeSupplierSku', () => {
    it('normalizes whitespace, unicode, and case', () => {
      expect(service.normalizeSupplierSku('  abc-123  ')).toBe('ABC-123');
      expect(service.normalizeSupplierSku('med_001')).toBe('MED_001');
      expect(service.normalizeSupplierSku(null)).toBe('');
      expect(service.normalizeSupplierSku(undefined)).toBe('');
    });
  });

  describe('normalizeUnit', () => {
    it('normalizes whitespace and lowercase', () => {
      expect(service.normalizeUnit('  Caja  ')).toBe('caja');
      expect(service.normalizeUnit('Frasco  100ml')).toBe('frasco 100ml');
      expect(service.normalizeUnit(null)).toBe('');
    });
  });

  describe('parseCost', () => {
    it('rejects empty or whitespace cost', () => {
      expect(service.parseCost('', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_EMPTY,
      );
      expect(service.parseCost('   ', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_EMPTY,
      );
      expect(service.parseCost(null, 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_EMPTY,
      );
    });

    it('parses numeric values and formats to 4 decimals', () => {
      expect(service.parseCost(1250, 2)).toEqual({
        costCanonical: '1250.0000',
      });
      expect(service.parseCost(1250.5, 2)).toEqual({
        costCanonical: '1250.5000',
      });
      expect(service.parseCost(1250.5555, 2)).toEqual({
        costCanonical: '1250.5555',
      });
    });

    it('parses standard dot decimal string', () => {
      expect(service.parseCost('1250.50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
    });

    it('parses Argentine comma decimal string', () => {
      expect(service.parseCost('1250,50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
    });

    it('parses thousands grouping with comma decimal (1.250,50)', () => {
      expect(service.parseCost('1.250,50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
      expect(service.parseCost('12.345.678,90', 2)).toEqual({
        costCanonical: '12345678.9000',
      });
    });

    it('parses thousands grouping with dot decimal (1,250.50)', () => {
      expect(service.parseCost('1,250.50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
      expect(service.parseCost('12,345,678.90', 2)).toEqual({
        costCanonical: '12345678.9000',
      });
    });

    it('rejects ambiguous formats (1.250 and 1,250)', () => {
      const resDot = service.parseCost('1.250', 2);
      expect(resDot.error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_AMBIGUOUS_FORMAT,
      );

      const resComma = service.parseCost('1,250', 2);
      expect(resComma.error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_AMBIGUOUS_FORMAT,
      );
    });

    it('strips currency symbols and spaces', () => {
      expect(service.parseCost('$ 1250.50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
      expect(service.parseCost('ARS 1250,50', 2)).toEqual({
        costCanonical: '1250.5000',
      });
    });

    it('rejects zero and negative costs', () => {
      expect(service.parseCost(0, 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_ZERO,
      );
      expect(service.parseCost('0', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_ZERO,
      );
      expect(service.parseCost('-10.50', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_NEGATIVE,
      );
    });

    it('rejects non-numeric characters', () => {
      expect(service.parseCost('abc', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
      );
      expect(service.parseCost('12.50.40', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
      );
    });

    it('rejects values with more than 4 decimals', () => {
      expect(service.parseCost('1250.12345', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_EXCEEDS_DECIMALS,
      );
    });

    it('rejects values exceeding max numeric bounds', () => {
      expect(service.parseCost('100000000.00', 2).error?.code).toBe(
        ImporterRowErrorCode.ROW_COST_EXCEEDS_MAX,
      );
    });
  });

  describe('parseQuantity', () => {
    it('returns nulls when unmapped', () => {
      expect(service.parseQuantity('100', 2, false)).toEqual({
        rawQuantity: null,
        quantityCanonical: null,
      });
    });

    it('returns nulls when mapped but empty', () => {
      expect(service.parseQuantity('', 2, true)).toEqual({
        rawQuantity: null,
        quantityCanonical: null,
      });
      expect(service.parseQuantity(null, 2, true)).toEqual({
        rawQuantity: null,
        quantityCanonical: null,
      });
    });

    it('parses valid positive quantity and preserves raw string', () => {
      expect(service.parseQuantity('10', 2, true)).toEqual({
        rawQuantity: '10',
        quantityCanonical: '10.0000',
      });
      expect(service.parseQuantity('2.5', 2, true)).toEqual({
        rawQuantity: '2.5',
        quantityCanonical: '2.5000',
      });
    });

    it('rejects zero or negative quantities', () => {
      expect(service.parseQuantity('0', 2, true).error?.code).toBe(
        ImporterRowErrorCode.ROW_QUANTITY_ZERO_OR_NEGATIVE,
      );
      expect(service.parseQuantity('-5', 2, true).error?.code).toBe(
        ImporterRowErrorCode.ROW_QUANTITY_ZERO_OR_NEGATIVE,
      );
    });

    it('rejects non-numeric quantity', () => {
      expect(service.parseQuantity('bulto', 2, true).error?.code).toBe(
        ImporterRowErrorCode.ROW_QUANTITY_NOT_NUMERIC,
      );
    });
  });

  describe('validateUnit', () => {
    it('returns nulls when unmapped', () => {
      expect(service.validateUnit('Caja', 2, false)).toEqual({
        rawPurchaseUnit: null,
        normalizedUnit: null,
      });
    });

    it('returns error when mapped but empty', () => {
      expect(service.validateUnit('', 2, true).error?.code).toBe(
        ImporterRowErrorCode.ROW_UNIT_EMPTY,
      );
      expect(service.validateUnit(null, 2, true).error?.code).toBe(
        ImporterRowErrorCode.ROW_UNIT_EMPTY,
      );
    });

    it('accepts unit matching associated name or symbol', () => {
      const associatedUnit = { name: 'Frasco', symbol: 'FCO' };
      expect(service.validateUnit('frasco', 2, true, associatedUnit)).toEqual({
        rawPurchaseUnit: 'frasco',
        normalizedUnit: 'frasco',
      });
      expect(service.validateUnit('FCO', 2, true, associatedUnit)).toEqual({
        rawPurchaseUnit: 'FCO',
        normalizedUnit: 'fco',
      });
    });

    it('rejects incompatible unit when associated', () => {
      const associatedUnit = { name: 'Frasco', symbol: 'FCO' };
      const res = service.validateUnit('Caja', 2, true, associatedUnit);
      expect(res.error?.code).toBe(ImporterRowErrorCode.ROW_UNIT_INCOMPATIBLE);
    });
  });
});

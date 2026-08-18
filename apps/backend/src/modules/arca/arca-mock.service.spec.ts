import { BadRequestException } from '@nestjs/common';
import { ArcaMockService } from './arca-mock.service';
import { FiscalDocumentType } from '@erp/shared-types';

describe('ArcaMockService', () => {
  const originalEnv = process.env;
  const fixedNow = new Date('2026-08-18T12:00:00.000Z');

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      ARCA_ENV: 'development',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  describe('constructor & security guard', () => {
    it('should throw an error if instantiated in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(() => new ArcaMockService()).toThrow(
        /ArcaMockService is strictly prohibited in production or homologation environments/,
      );
    });

    it('should throw an error if instantiated with ARCA_ENV=production', () => {
      process.env.ARCA_ENV = 'production';
      expect(() => new ArcaMockService()).toThrow(
        /ArcaMockService is strictly prohibited in production or homologation environments/,
      );
    });

    it('should throw an error if instantiated with ARCA_ENV=homologation', () => {
      process.env.ARCA_ENV = 'homologation';
      expect(() => new ArcaMockService()).toThrow(
        /ArcaMockService is strictly prohibited in production or homologation environments/,
      );
    });

    it('should instantiate cleanly in development environment', () => {
      const service = new ArcaMockService({ latencyMs: 0 });
      expect(service).toBeDefined();
    });
  });

  describe('login', () => {
    it('should return deterministic mock WSAA ticket with 12h expiration from injected now()', async () => {
      const service = new ArcaMockService({
        latencyMs: 0,
        now: () => fixedNow,
      });

      const ticket = await service.login();

      expect(ticket.token).toBe('mock-wsaa-token-xyz-1234567890');
      expect(ticket.sign).toBe('mock-wsaa-sign-abc-1234567890');
      // 12 hours from 2026-08-18T12:00:00.000Z -> 2026-08-19T00:00:00.000Z
      expect(ticket.expirationTime).toBe('2026-08-19T00:00:00.000Z');
    });
  });

  describe('requestCAE', () => {
    it('should return fixed 14-digit CAE and deterministic expiration date (10 days in future)', async () => {
      const service = new ArcaMockService({
        latencyMs: 0,
        now: () => fixedNow,
      });

      const response = await service.requestCAE({
        documentType: FiscalDocumentType.FACTURA_B,
        pointOfSale: 1,
        documentNumber: 101,
        totalAmount: 1500,
        netAmount: 1239.67,
        ivaAmount: 260.33,
      });

      expect(response.cae).toBe('99999999999999');
      // 10 days from Aug 18 -> Aug 28
      expect(response.caeExpiration).toBe('20260828');
    });

    it('should apply simulated latency when latencyMs > 0', async () => {
      jest.useFakeTimers();
      const service = new ArcaMockService({
        latencyMs: 200,
        now: () => fixedNow,
      });

      const promise = service.requestCAE({
        documentType: FiscalDocumentType.FACTURA_B,
        pointOfSale: 1,
        documentNumber: 101,
        totalAmount: 1500,
        netAmount: 1239.67,
        ivaAmount: 260.33,
      });

      jest.advanceTimersByTime(200);
      const response = await promise;

      expect(response.cae).toBe('99999999999999');
    });

    it('should reject missing fiscal document data', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });
      await expect(service.requestCAE(null as unknown as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-positive or non-integer pointOfSale', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });

      await expect(
        service.requestCAE({
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 0,
          documentNumber: 1,
          totalAmount: 100,
          netAmount: 100,
          ivaAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.requestCAE({
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1.5,
          documentNumber: 1,
          totalAmount: 100,
          netAmount: 100,
          ivaAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-positive or non-integer documentNumber', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });

      await expect(
        service.requestCAE({
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: -5,
          totalAmount: 100,
          netAmount: 100,
          ivaAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative or non-number totalAmount', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });

      await expect(
        service.requestCAE({
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 1,
          totalAmount: -10,
          netAmount: 0,
          ivaAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.requestCAE({
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 1,
          totalAmount: NaN,
          netAmount: 0,
          ivaAmount: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('queryDocument', () => {
    it('should return null for valid positive integer parameters', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });
      const result = await service.queryDocument(6, 1, 500);
      expect(result).toBeNull();
    });

    it('should reject non-positive or non-integer parameters', async () => {
      const service = new ArcaMockService({ latencyMs: 0 });

      await expect(service.queryDocument(0, 1, 500)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.queryDocument(1, 0, 500)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.queryDocument(1, 1, -10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.queryDocument(1.2, 1, 500)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

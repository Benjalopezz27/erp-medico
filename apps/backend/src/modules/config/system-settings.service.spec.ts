import { TaxCondition } from '@erp/shared-types';
import { SystemSettingsService } from './system-settings.service';

type Row = { key: string; value: string };

describe('SystemSettingsService', () => {
  let rows: Row[];
  let env: Record<string, string | undefined>;
  const saved: Row[] = [];
  const manager = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (_e, row: Row) => {
      saved.push(row);
      return row;
    }),
  } as any;
  const repository = { find: jest.fn(async () => rows) } as any;
  const dataSource = {
    transaction: jest.fn(async (cb) => cb(manager)),
  } as any;
  const auditService = { record: jest.fn() } as any;
  const configService = { get: jest.fn((k: string) => env[k]) } as any;
  let service: SystemSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
    saved.length = 0;
    env = {};
    service = new SystemSettingsService(
      dataSource,
      repository,
      auditService,
      configService,
    );
  });

  describe('getEffective', () => {
    it('defaults to ARS and null when nothing is defined', async () => {
      await expect(service.getEffective()).resolves.toEqual({
        issuerRazonSocial: null,
        issuerCuit: null,
        issuerTaxCondition: null,
        arcaPuntoVenta: null,
        operatingCurrency: 'ARS',
      });
    });

    it('falls back to env', async () => {
      env = { ARCA_CUIT: '20123456786', ARCA_PUNTO_VENTA: '3' };
      const cfg = await service.getEffective();
      expect(cfg.issuerCuit).toBe('20123456786');
      expect(cfg.arcaPuntoVenta).toBe(3);
    });

    it('database wins over env', async () => {
      env = { ARCA_EMISOR_RAZON_SOCIAL: 'Env SA' };
      rows = [{ key: 'issuer_razon_social', value: 'Db SA' }];
      expect((await service.getEffective()).issuerRazonSocial).toBe('Db SA');
    });
  });

  describe('update', () => {
    it('persists and audits only changed fields', async () => {
      rows = [{ key: 'issuer_razon_social', value: 'Same SA' }];
      await service.update(
        { issuerRazonSocial: 'Same SA', operatingCurrency: 'USD' },
        'admin',
      );
      expect(saved.map((r) => r.key)).toEqual(['operating_currency']);
      expect(auditService.record).toHaveBeenCalledTimes(1);
      expect(auditService.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actorId: 'admin',
          entityName: 'SystemSetting',
          entityId: 'operating_currency',
          previousValues: { value: 'ARS' },
          newValues: { value: 'USD' },
        }),
      );
    });

    it('stores numbers and enums as text', async () => {
      await service.update(
        {
          arcaPuntoVenta: 5,
          issuerTaxCondition: TaxCondition.MONOTRIBUTO,
        },
        'admin',
      );
      expect(saved).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'arca_punto_venta', value: '5' }),
          expect.objectContaining({
            key: 'issuer_tax_condition',
            value: 'MONOTRIBUTO',
          }),
        ]),
      );
    });

    it('writes nothing when the payload is empty', async () => {
      await service.update({}, 'admin');
      expect(manager.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  it('getIssuer returns the issuer subset', async () => {
    rows = [{ key: 'issuer_cuit', value: '20123456786' }];
    await expect(service.getIssuer()).resolves.toEqual({
      razonSocial: null,
      cuit: '20123456786',
      taxCondition: null,
    });
  });
});

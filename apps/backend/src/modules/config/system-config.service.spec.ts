import { BadRequestException } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigService purchase settings', () => {
  const settings: any = {
    id: 1,
    costTolerancePercentage: '5.0000',
    updatedByUserId: null,
    updatedAt: new Date('2026-08-27T12:00:00Z'),
  };
  const qb = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOneOrFail: jest.fn(async () => settings),
  };
  const manager = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(async () => ({
      id: 'admin',
      name: 'Admin',
      email: 'admin@erp.com',
    })),
    save: jest.fn(async (_entity, value) => value),
  } as any;
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  } as any;
  const auditService = { record: jest.fn() } as any;
  const repository = { manager } as any;
  let service: SystemConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    settings.costTolerancePercentage = '5.0000';
    settings.updatedByUserId = null;
    service = new SystemConfigService(dataSource, auditService, repository);
  });

  it('updates and audits a canonical tolerance', async () => {
    const result = await service.updatePurchaseSettings(
      { costTolerancePercentage: '7.5' },
      'admin',
    );
    expect(result.costTolerancePercentage).toBe('7.5000');
    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
  });

  it('rejects out-of-range values and does not audit a no-op', async () => {
    await expect(
      service.updatePurchaseSettings(
        { costTolerancePercentage: '100.0001' },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updatePurchaseSettings(
      { costTolerancePercentage: '5' },
      'admin',
    );
    expect(auditService.record).not.toHaveBeenCalled();
  });
});

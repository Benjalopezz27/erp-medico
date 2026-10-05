import 'reflect-metadata';
import { UserRole } from '@erp/shared-types';
import { ROLES_KEY } from '../auth/constants/auth.constants';
import { SystemConfigController } from './system-config.controller';

describe('SystemConfigController general settings', () => {
  const settings = {
    getEffective: jest.fn().mockResolvedValue({ operatingCurrency: 'ARS' }),
    update: jest.fn().mockResolvedValue({ operatingCurrency: 'USD' }),
  } as any;
  const controller = new SystemConfigController({} as any, settings);

  it('delegates reads and writes with the acting user', async () => {
    await controller.getSettings();
    await controller.updateSettings({ operatingCurrency: 'USD' }, {
      id: 'u1',
    } as any);
    expect(settings.update).toHaveBeenCalledWith(
      { operatingCurrency: 'USD' },
      'u1',
    );
  });

  it.each(['getSettings', 'updateSettings'] as const)(
    '%s is restricted to ADMINISTRADOR',
    (method) => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          SystemConfigController.prototype[method],
        ),
      ).toEqual([UserRole.ADMINISTRADOR]);
    },
  );
});

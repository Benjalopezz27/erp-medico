import 'reflect-metadata';
import { UserRole } from '@erp/shared-types';
import { ROLES_KEY } from '../auth/constants/auth.constants';
import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
  it('delegates to the service', async () => {
    const service = {
      getKpis: jest.fn().mockResolvedValue({ salesToday: '0.00' }),
    } as any;
    await expect(new DashboardController(service).kpis()).resolves.toEqual({
      salesToday: '0.00',
    });
  });

  it('is restricted to ADMINISTRADOR', () => {
    expect(Reflect.getMetadata(ROLES_KEY, DashboardController)).toEqual([
      UserRole.ADMINISTRADOR,
    ]);
  });
});

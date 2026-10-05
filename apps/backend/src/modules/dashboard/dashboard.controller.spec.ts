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

  it('keeps kpis restricted to ADMINISTRADOR and opens activity to both roles', () => {
    const proto = DashboardController.prototype;
    expect(Reflect.getMetadata(ROLES_KEY, proto.kpis)).toEqual([
      UserRole.ADMINISTRADOR,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, proto.activity)).toEqual([
      UserRole.ADMINISTRADOR,
      UserRole.VENDEDOR,
    ]);
  });

  it('passes the actor role and limit to the activity service, defaulting to 15', async () => {
    const service = { getActivity: jest.fn().mockResolvedValue([]) } as any;
    const controller = new DashboardController(service);
    await controller.activity({ limit: 5 }, { role: UserRole.VENDEDOR } as any);
    await controller.activity({}, { role: UserRole.ADMINISTRADOR } as any);
    expect(service.getActivity).toHaveBeenNthCalledWith(
      1,
      UserRole.VENDEDOR,
      5,
    );
    expect(service.getActivity).toHaveBeenNthCalledWith(
      2,
      UserRole.ADMINISTRADOR,
      15,
    );
  });
});

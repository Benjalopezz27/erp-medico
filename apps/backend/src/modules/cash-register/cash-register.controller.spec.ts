import 'reflect-metadata';
import { UserRole } from '@erp/shared-types';
import { ROLES_KEY } from '../auth/constants/auth.constants';
import { CashRegisterController } from './cash-register.controller';

describe('CashRegisterController', () => {
  const service = {
    getState: jest.fn().mockResolvedValue({ open: null }),
    open: jest.fn().mockResolvedValue({ id: 'c1', openingBalance: '1.00' }),
    close: jest.fn().mockResolvedValue({ id: 'c1', difference: '-5.00' }),
  } as any;
  const controller = new CashRegisterController(service);

  it('delegates and returns minimal bodies', async () => {
    await expect(controller.current()).resolves.toEqual({ open: null });
    await expect(
      controller.open({ openingBalance: '1' }, { id: 'u1' } as any),
    ).resolves.toEqual({ id: 'c1' });
    await expect(
      controller.close({ actualBalance: '0' }, { id: 'u1' } as any),
    ).resolves.toEqual({ id: 'c1', difference: '-5.00' });
    expect(service.open).toHaveBeenCalledWith({ openingBalance: '1' }, 'u1');
  });

  it('is restricted to ADMINISTRADOR at class level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CashRegisterController)).toEqual([
      UserRole.ADMINISTRADOR,
    ]);
  });
});

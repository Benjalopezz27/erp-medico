import 'reflect-metadata';
import { UserRole } from '@erp/shared-types';
import { ROLES_KEY } from '../auth/constants/auth.constants';
import { TreasuryController } from './treasury.controller';

describe('TreasuryController', () => {
  const service = {
    getSummary: jest.fn().mockResolvedValue({ accounts: [] }),
    listMovements: jest.fn().mockResolvedValue({ data: [] }),
    createManual: jest.fn().mockResolvedValue({ id: 'm1' }),
  } as any;
  const controller = new TreasuryController(service);

  it('delegates and returns only the created id', async () => {
    const dto = { concept: 'x' } as any;
    await controller.summary();
    await controller.movements({ page: 1 } as any);
    await expect(
      controller.createMovement(dto, { id: 'u1' } as any),
    ).resolves.toEqual({
      id: 'm1',
    });
    expect(service.createManual).toHaveBeenCalledWith(dto, 'u1');
  });

  it('is restricted to ADMINISTRADOR at class level', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TreasuryController)).toEqual([
      UserRole.ADMINISTRADOR,
    ]);
  });
});

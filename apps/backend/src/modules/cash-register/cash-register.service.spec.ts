import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AuditAction,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { CashRegisterService } from './cash-register.service';

const mov = (movementType: TreasuryMovementType, amount: string) => ({
  id: `m-${amount}`,
  accountType: TreasuryAccountType.EFECTIVO,
  movementType,
  amount,
  concept: 'x',
  referenceType: null,
  referenceId: null,
  user: null,
  createdAt: '2026-10-05T12:00:00.000Z',
});

describe('CashRegisterService', () => {
  let open: any;
  let lastClosed: any;
  let movements: any[];
  const saved: any[] = [];
  const repo = {
    findOne: jest.fn(async ({ where, order }: any) =>
      order ? lastClosed : where.closedAt ? open : null,
    ),
    save: jest.fn(async (row: any) => {
      saved.push({ ...row });
      return { id: 'cr-1', ...row };
    }),
    create: jest.fn((row: any) => row),
  };
  const manager = { getRepository: jest.fn(() => repo) };
  const dataSource = {
    transaction: jest.fn(async (cb: any) => cb(manager)),
    getRepository: jest.fn(() => repo),
    manager,
  };
  const treasury = {
    listCashMovementsSince: jest.fn(async () => movements),
    recordMovement: jest.fn(async () => ({})),
  };
  const audit = { record: jest.fn(async () => ({})) };
  const service = new CashRegisterService(
    dataSource as any,
    treasury as any,
    audit as any,
  );

  const openRegister = () => ({
    id: 'cr-1',
    openedAt: new Date('2026-10-05T11:00:00.000Z'),
    openingBalance: '1000.00',
    closedAt: null,
    expectedBalance: null,
    actualBalance: null,
    difference: null,
    observation: null,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    saved.length = 0;
    open = null;
    lastClosed = null;
    movements = [];
  });

  describe('open', () => {
    it('opens a register with the opening balance and audits it', async () => {
      await service.open({ openingBalance: '1000' }, 'u-1');
      expect(saved[0]).toMatchObject({
        openingBalance: '1000.00',
        openedBy: 'u-1',
      });
      expect(audit.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'CashRegister',
        }),
      );
    });

    it('answers 409 when a register is already open', async () => {
      open = openRegister();
      await expect(
        service.open({ openingBalance: '10' }, 'u-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toHaveLength(0);
    });

    it('answers 409 when the unique index rejects a concurrent open', async () => {
      repo.save.mockRejectedValueOnce({ code: '23505' });
      await expect(
        service.open({ openingBalance: '10' }, 'u-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getState', () => {
    it('reports closed state with the last closing', async () => {
      lastClosed = {
        ...openRegister(),
        closedAt: new Date('2026-10-04T20:00:00.000Z'),
        expectedBalance: '90.00',
        actualBalance: '90.00',
        difference: '0.00',
      };
      const state = await service.getState();
      expect(state.open).toBeNull();
      expect(state.lastClosed?.actualBalance).toBe('90.00');
    });

    it('computes expected = opening + ingresos - egresos', async () => {
      open = openRegister();
      movements = [
        mov(TreasuryMovementType.INGRESO, '60.00'),
        mov(TreasuryMovementType.EGRESO, '10.00'),
      ];
      const state = await service.getState();
      expect(state.open?.expectedBalance).toBe('1050.00');
      expect(state.movements).toHaveLength(2);
    });
  });

  describe('close', () => {
    beforeEach(() => {
      open = openRegister();
      movements = [mov(TreasuryMovementType.INGRESO, '50.00')];
    });

    it('closes with zero difference and no adjustment', async () => {
      await service.close({ actualBalance: '1050.00' }, 'u-1');
      expect(saved[0]).toMatchObject({
        expectedBalance: '1050.00',
        actualBalance: '1050.00',
        difference: '0.00',
        closedBy: 'u-1',
      });
      expect(saved[0].closedAt).toBeInstanceOf(Date);
      expect(treasury.recordMovement).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityName: 'CashRegister',
          entityId: 'cr-1',
        }),
      );
    });

    it('requires an observation when there is a difference', async () => {
      await expect(
        service.close({ actualBalance: '1010.00', observation: '  ' }, 'u-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saved).toHaveLength(0);
      expect(treasury.recordMovement).not.toHaveBeenCalled();
    });

    it('records an EGRESO adjustment for a shortage', async () => {
      await service.close(
        { actualBalance: '1010.00', observation: 'Faltó cambio' },
        'u-1',
      );
      expect(saved[0]).toMatchObject({
        difference: '-40.00',
        observation: 'Faltó cambio',
      });
      expect(treasury.recordMovement).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          accountType: TreasuryAccountType.EFECTIVO,
          movementType: TreasuryMovementType.EGRESO,
          amount: '40.00',
          referenceType: 'CASH_REGISTER',
          referenceId: 'cr-1',
        }),
      );
    });

    it('records an INGRESO adjustment for a surplus', async () => {
      await service.close(
        { actualBalance: '1070.50', observation: 'Sobrante' },
        'u-1',
      );
      expect(saved[0].difference).toBe('20.50');
      expect(treasury.recordMovement).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          movementType: TreasuryMovementType.INGRESO,
          amount: '20.50',
        }),
      );
    });

    it('answers 409 when there is no open register', async () => {
      open = null;
      await expect(
        service.close({ actualBalance: '0' }, 'u-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('locks the open register row', async () => {
      await service.close({ actualBalance: '1050.00' }, 'u-1');
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });
  });
});

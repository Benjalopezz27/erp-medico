import { BadRequestException } from '@nestjs/common';
import {
  PaymentMethod,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { accountForPaymentMethod } from './payment-method-account';
import { TreasuryService } from './treasury.service';

describe('accountForPaymentMethod', () => {
  it.each([
    [PaymentMethod.EFECTIVO, TreasuryAccountType.EFECTIVO],
    [PaymentMethod.TRANSFERENCIA, TreasuryAccountType.BANCOS],
    [PaymentMethod.DEBITO, TreasuryAccountType.BANCOS],
    [PaymentMethod.CREDITO, TreasuryAccountType.BANCOS],
    [PaymentMethod.QR, TreasuryAccountType.BANCOS],
    [PaymentMethod.CHEQUE, TreasuryAccountType.CHEQUES_CARTERA],
    [PaymentMethod.CTA_CTE, null],
  ])('%s -> %s', (method, account) => {
    expect(accountForPaymentMethod(method)).toBe(account);
  });
});

describe('TreasuryService', () => {
  const saved: any[] = [];
  const manager = {
    findOne: jest.fn(async (_e, { where }) => ({
      id: `acc-${where.accountType}`,
    })),
    save: jest.fn(async (_e, row) => {
      saved.push(row);
      return { id: 'mov-1', ...row };
    }),
  } as any;
  const dataSource = {
    transaction: jest.fn(async (cb) => cb(manager)),
    query: jest.fn(),
    getRepository: jest.fn(),
  } as any;
  const service = new TreasuryService(dataSource);

  beforeEach(() => {
    jest.clearAllMocks();
    saved.length = 0;
  });

  describe('recordMovement', () => {
    it('stores a movement in the account of the given type', async () => {
      await service.recordMovement(manager, {
        accountType: TreasuryAccountType.BANCOS,
        movementType: TreasuryMovementType.INGRESO,
        amount: '150.5',
        concept: 'Cobro',
        referenceType: 'PAYMENT',
        referenceId: 'p1',
        userId: 'u1',
      });
      expect(saved[0]).toMatchObject({
        treasuryAccountId: 'acc-BANCOS',
        movementType: 'INGRESO',
        amount: '150.50',
        referenceType: 'PAYMENT',
        referenceId: 'p1',
        userId: 'u1',
      });
    });

    it.each(['0', '-5', 'abc', '1.001'])(
      'rejects amount %s',
      async (amount) => {
        await expect(
          service.recordMovement(manager, {
            accountType: TreasuryAccountType.EFECTIVO,
            movementType: TreasuryMovementType.INGRESO,
            amount,
            concept: 'x',
            userId: 'u1',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('createManual', () => {
    it('records the movement inside a transaction', async () => {
      await service.createManual(
        {
          accountType: TreasuryAccountType.EFECTIVO,
          movementType: TreasuryMovementType.EGRESO,
          amount: '10000',
          concept: 'Gasto: librería',
        },
        'u1',
      );
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(saved[0]).toMatchObject({
        amount: '10000.00',
        referenceType: 'MANUAL',
      });
    });
  });

  describe('getSummary', () => {
    it('maps derived balances with 2 decimals', async () => {
      dataSource.query.mockResolvedValue([
        { account_type: 'EFECTIVO', name: 'Efectivo', balance: '200' },
        { account_type: 'BANCOS', name: 'Bancos', balance: '0' },
      ]);
      await expect(service.getSummary()).resolves.toEqual({
        accounts: [
          { accountType: 'EFECTIVO', name: 'Efectivo', balance: '200.00' },
          { accountType: 'BANCOS', name: 'Bancos', balance: '0.00' },
        ],
      });
    });
  });

  describe('listMovements', () => {
    const qb: any = {};
    beforeEach(() => {
      for (const m of [
        'leftJoin',
        'leftJoinAndSelect',
        'andWhere',
        'orderBy',
        'addOrderBy',
        'skip',
        'take',
      ]) {
        qb[m] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([
        [
          {
            id: 'm1',
            account: { accountType: 'BANCOS' },
            movementType: 'INGRESO',
            amount: '5.00',
            concept: 'c',
            referenceType: null,
            referenceId: null,
            user: { id: 'u1', name: 'Ana' },
            createdAt: new Date('2026-10-01T10:00:00Z'),
          },
        ],
        41,
      ]);
      dataSource.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn(() => qb),
      });
    });

    it('applies only the provided filters and paginates', async () => {
      const result = await service.listMovements({
        page: 2,
        limit: 20,
        accountType: TreasuryAccountType.BANCOS,
        from: '2026-10-01',
      });
      const clauses = qb.andWhere.mock.calls
        .map(([c]: [string]) => c)
        .join('|');
      expect(clauses).toContain('account.accountType');
      expect(clauses).toContain(':from');
      expect(clauses).not.toContain(':to');
      expect(clauses).not.toContain('movementType');
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
      });
      expect(result.data[0]).toMatchObject({
        id: 'm1',
        accountType: 'BANCOS',
        user: { id: 'u1', name: 'Ana' },
        createdAt: '2026-10-01T10:00:00.000Z',
      });
    });
  });
});

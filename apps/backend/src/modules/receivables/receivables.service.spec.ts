import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  CheckErrorCode,
  PaymentAllocationType,
} from '@erp/shared-types';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountReceivable } from './entities/account-receivable.entity';
import { ReceivablesService } from './receivables.service';

describe('ReceivablesService', () => {
  const receivableRepo = {
    create: jest.fn((value) => ({ id: 'debt-1', ...value })),
    save: jest.fn(async (value) => value),
  };
  const movementRepo = {
    create: jest.fn((value) => ({ id: 'mov-1', ...value })),
    save: jest.fn(async (value) => value),
  };
  const query = jest.fn().mockResolvedValue([{ credit_limit: '0.00' }]);
  const manager = {
    queryRunner: { isTransactionActive: true },
    query,
    getRepository: jest.fn((entity) =>
      entity === AccountReceivable ? receivableRepo : movementRepo,
    ),
  };
  const service = new ReceivablesService();
  const input = {
    customerId: 'customer-1',
    saleId: 'sale-1',
    fiscalDocumentId: 'fiscal-1',
    saleNumber: 'V-00000001',
    totalGross: '121.00',
    userId: 'user-1',
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects the debt when balance plus invoice exceeds the credit limit', async () => {
    query
      .mockResolvedValueOnce([{ credit_limit: '200.00' }])
      .mockResolvedValueOnce([{ balance: '121.00' }]);

    await expect(
      service.recordCreditSaleDebt(manager as any, input),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(receivableRepo.save).not.toHaveBeenCalled();
  });

  it('creates the debt and its FACTURA movement in the supplied transaction', async () => {
    const result = await service.recordCreditSaleDebt(manager as any, input);

    expect(result).toMatchObject({
      originalAmount: '121.00',
      currentBalance: '121.00',
      status: AccountReceivableStatus.PENDIENTE,
      dueDate: null,
    });
    expect(receivableRepo.save).toHaveBeenCalledTimes(1);
    expect(movementRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountReceivableId: 'debt-1',
        movementType: AccountReceivableMovementType.FACTURA,
        amount: '121.00',
        previousBalance: '0.00',
        subsequentBalance: '121.00',
        fiscalDocumentId: 'fiscal-1',
        userId: 'user-1',
      }),
    );
  });

  it('rejects a zero total instead of writing an empty ledger entry', async () => {
    await expect(
      service.recordCreditSaleDebt(manager as any, {
        ...input,
        totalGross: '0.00',
      }),
    ).rejects.toThrow('positive');
    expect(receivableRepo.save).not.toHaveBeenCalled();
    expect(movementRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a manager without an active transaction', async () => {
    await expect(
      service.recordCreditSaleDebt(
        { ...manager, queryRunner: { isTransactionActive: false } } as any,
        input,
      ),
    ).rejects.toThrow('requires an active transaction');
  });

  describe('recordCreditNoteCompensation', () => {
    it('compensates partial balance, updates status to PARCIAL, and records movement', async () => {
      const ar = {
        id: 'ar-1',
        saleId: 'sale-1',
        currentBalance: '242.00',
        status: AccountReceivableStatus.PENDIENTE,
      };
      const arRepo = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(async () => ar),
        })),
        save: jest.fn(async (val) => val),
      };
      const armRepo = {
        findOne: jest.fn(async () => null),
        create: jest.fn((val) => ({ id: 'arm-1', ...val })),
        save: jest.fn(async (val) => val),
      };

      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn((entity) => {
          if (entity.name === 'AccountReceivable') return arRepo;
          return armRepo;
        }),
      };

      const res = await service.recordCreditNoteCompensation(txManager as any, {
        saleId: 'sale-1',
        saleReturnId: 'ret-1',
        fiscalDocumentId: 'fiscal-nc-1',
        creditNoteAmount: '100.00',
        userId: 'user-1',
      });

      expect(res).not.toBeNull();
      expect(res?.accountReceivable.currentBalance).toBe('142.00');
      expect(res?.accountReceivable.status).toBe(
        AccountReceivableStatus.PARCIAL,
      );
      expect(res?.movement.amount).toBe('100.00');
    });

    it('compensates full balance and updates status to CANCELADO', async () => {
      const ar = {
        id: 'ar-1',
        saleId: 'sale-1',
        currentBalance: '242.00',
        status: AccountReceivableStatus.PENDIENTE,
      };
      const arRepo = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(async () => ar),
        })),
        save: jest.fn(async (val) => val),
      };
      const armRepo = {
        findOne: jest.fn(async () => null),
        create: jest.fn((val) => ({ id: 'arm-1', ...val })),
        save: jest.fn(async (val) => val),
      };

      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn((entity) => {
          if (entity.name === 'AccountReceivable') return arRepo;
          return armRepo;
        }),
      };

      const res = await service.recordCreditNoteCompensation(txManager as any, {
        saleId: 'sale-1',
        saleReturnId: 'ret-1',
        fiscalDocumentId: 'fiscal-nc-1',
        creditNoteAmount: '242.00',
        userId: 'user-1',
      });

      expect(res?.accountReceivable.currentBalance).toBe('0.00');
      expect(res?.accountReceivable.status).toBe(
        AccountReceivableStatus.CANCELADO,
      );
    });

    it('absorbs only the open balance when the credit note exceeds it', async () => {
      const ar = {
        id: 'ar-1',
        saleId: 'sale-1',
        currentBalance: '100.00',
        status: AccountReceivableStatus.PARCIAL,
      };
      const arRepo = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(async () => ar),
        })),
        save: jest.fn(async (val) => val),
      };
      const armRepo = {
        findOne: jest.fn(async () => null),
        create: jest.fn((val) => ({ id: 'arm-1', ...val })),
        save: jest.fn(async (val) => val),
      };
      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn((entity) => {
          if (entity.name === 'AccountReceivable') return arRepo;
          return armRepo;
        }),
      };

      const res = await service.recordCreditNoteCompensation(txManager as any, {
        saleId: 'sale-1',
        saleReturnId: 'ret-1',
        fiscalDocumentId: 'fiscal-nc-1',
        creditNoteAmount: '150.00',
        userId: 'user-1',
      });
      expect(res?.applied).toBe('100.00');
      expect(res?.accountReceivable.currentBalance).toBe('0.00');
    });

    it('returns null for cash sale with no account receivable', async () => {
      const arRepo = {
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(async () => null),
        })),
      };
      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn(() => arRepo),
      };

      const res = await service.recordCreditNoteCompensation(txManager as any, {
        saleId: 'sale-cash-1',
        saleReturnId: 'ret-1',
        fiscalDocumentId: null,
        creditNoteAmount: '50.00',
        userId: 'user-1',
      });

      expect(res).toBeNull();
    });
  });

  describe('applyPayment', () => {
    const account = (
      id: string,
      balance: string,
      createdAt = '2026-01-01',
    ) => ({
      id,
      customerId: 'customer-1',
      originalAmount: balance,
      currentBalance: balance,
      status: AccountReceivableStatus.PENDIENTE,
      createdAt: new Date(createdAt),
    });

    function setup(accounts: ReturnType<typeof account>[]) {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => accounts),
      };
      const arRepo = {
        createQueryBuilder: jest.fn(() => qb),
        save: jest.fn(async (val) => val),
      };
      const armRepo = {
        create: jest.fn((val) => ({ id: 'arm', ...val })),
        save: jest.fn(async (val) => val),
      };
      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn((entity) =>
          entity === AccountReceivable ? arRepo : armRepo,
        ),
      };
      return { txManager, arRepo, armRepo };
    }

    const base = {
      paymentId: 'pay-1',
      customerId: 'customer-1',
      userId: 'user-1',
    };
    const directed = (
      allocations: { accountReceivableId: string; amount: string }[],
    ) => ({
      ...base,
      mode: PaymentAllocationType.DIRECTED as const,
      allocations,
    });

    it('applies a partial payment: PARCIAL and PAGO movement with previous/subsequent', async () => {
      const ar = account('ar-1', '200.00');
      const { txManager, armRepo } = setup([ar]);

      const res = await service.applyPayment(
        txManager as any,
        directed([{ accountReceivableId: 'ar-1', amount: '100.00' }]),
      );

      expect(res.total).toBe('100.00');
      expect(ar.currentBalance).toBe('100.00');
      expect(ar.status).toBe(AccountReceivableStatus.PARCIAL);
      expect(armRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accountReceivableId: 'ar-1',
          movementType: AccountReceivableMovementType.PAGO,
          amount: '100.00',
          previousBalance: '200.00',
          subsequentBalance: '100.00',
          paymentId: 'pay-1',
          userId: 'user-1',
        }),
      );
    });

    it('cancels an invoice when the full balance is applied', async () => {
      const ar = account('ar-1', '200.00');
      const { txManager } = setup([ar]);

      await service.applyPayment(
        txManager as any,
        directed([{ accountReceivableId: 'ar-1', amount: '200.00' }]),
      );

      expect(ar.currentBalance).toBe('0.00');
      expect(ar.status).toBe(AccountReceivableStatus.CANCELADO);
    });

    it('rejects an amount above the invoice balance with 409 and saves nothing', async () => {
      const { txManager, arRepo, armRepo } = setup([account('ar-1', '200.00')]);

      await expect(
        service.applyPayment(
          txManager as any,
          directed([{ accountReceivableId: 'ar-1', amount: '300.00' }]),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(arRepo.save).not.toHaveBeenCalled();
      expect(armRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an invoice of another customer', async () => {
      const other = { ...account('ar-1', '200.00'), customerId: 'customer-2' };
      const { txManager } = setup([other]);

      await expect(
        service.applyPayment(
          txManager as any,
          directed([{ accountReceivableId: 'ar-1', amount: '50.00' }]),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown invoice id', async () => {
      const { txManager } = setup([]);

      await expect(
        service.applyPayment(
          txManager as any,
          directed([{ accountReceivableId: 'ar-9', amount: '50.00' }]),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicated invoice in the list', async () => {
      const { txManager } = setup([account('ar-1', '200.00')]);

      await expect(
        service.applyPayment(
          txManager as any,
          directed([
            { accountReceivableId: 'ar-1', amount: '50.00' },
            { accountReceivableId: 'ar-1', amount: '50.00' },
          ]),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-positive amounts and more than 2 decimals', async () => {
      const { txManager } = setup([account('ar-1', '200.00')]);

      for (const amount of ['0.00', '-5.00', '10.001']) {
        await expect(
          service.applyPayment(
            txManager as any,
            directed([{ accountReceivableId: 'ar-1', amount }]),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });

    it('requires an active transaction', async () => {
      const { txManager } = setup([]);
      await expect(
        service.applyPayment(
          { ...txManager, queryRunner: { isTransactionActive: false } } as any,
          directed([{ accountReceivableId: 'ar-1', amount: '1.00' }]),
        ),
      ).rejects.toThrow('requires an active transaction');
    });

    describe('by age (GLOBAL_AGE)', () => {
      const byAge = (totalAmount: string) => ({
        ...base,
        mode: PaymentAllocationType.GLOBAL_AGE as const,
        totalAmount,
      });

      it('cancels the oldest first and leaves the next one partial', async () => {
        const a = account('ar-old', '150.00', '2026-01-01');
        const b = account('ar-mid', '200.00', '2026-02-01');
        const c = account('ar-new', '100.00', '2026-03-01');
        const { txManager } = setup([a, b, c]);

        const res = await service.applyPayment(
          txManager as any,
          byAge('250.00'),
        );

        expect(res.total).toBe('250.00');
        expect(res.applied).toEqual([
          { accountReceivableId: 'ar-old', amount: '150.00' },
          { accountReceivableId: 'ar-mid', amount: '100.00' },
        ]);
        expect(a.status).toBe(AccountReceivableStatus.CANCELADO);
        expect(b.currentBalance).toBe('100.00');
        expect(b.status).toBe(AccountReceivableStatus.PARCIAL);
        expect(c.currentBalance).toBe('100.00');
        expect(c.status).toBe(AccountReceivableStatus.PENDIENTE);
      });

      it('rejects an amount above the total customer balance with 409', async () => {
        const { txManager, armRepo } = setup([
          account('ar-1', '150.00'),
          account('ar-2', '300.00'),
        ]);

        await expect(
          service.applyPayment(txManager as any, byAge('500.00')),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(armRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('reversePayment', () => {
    const account = (
      id: string,
      original: string,
      balance: string,
      status = AccountReceivableStatus.CANCELADO,
    ) => ({
      id,
      customerId: 'customer-1',
      documentReference: `V-${id}`,
      originalAmount: original,
      currentBalance: balance,
      status,
    });

    function setup(accounts: ReturnType<typeof account>[], active = true) {
      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => accounts),
      };
      const arRepo = {
        createQueryBuilder: jest.fn(() => qb),
        save: jest.fn(async (val) => val),
      };
      const armRepo = {
        create: jest.fn((val) => ({ id: 'arm', ...val })),
        save: jest.fn(async (val) => val),
      };
      const txManager = {
        queryRunner: { isTransactionActive: active },
        getRepository: jest.fn((entity) =>
          entity === AccountReceivable ? arRepo : armRepo,
        ),
      };
      return { txManager, arRepo, armRepo };
    }

    const input = (
      allocations: { accountReceivableId: string; amount: string }[],
    ) => ({
      paymentId: 'pay-1',
      userId: 'user-1',
      allocations,
    });

    it('reopens a fully paid invoice as PENDIENTE with REVERSION_CHEQUE movement', async () => {
      const ar = account('ar-1', '600.00', '0.00');
      const { txManager, armRepo } = setup([ar]);

      const res = await service.reversePayment(
        txManager as any,
        input([{ accountReceivableId: 'ar-1', amount: '600.00' }]),
      );

      expect(ar.currentBalance).toBe('600.00');
      expect(ar.status).toBe(AccountReceivableStatus.PENDIENTE);
      expect(res.totalIncrease).toBe('600.00');
      expect(armRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accountReceivableId: 'ar-1',
          movementType: AccountReceivableMovementType.REVERSION_CHEQUE,
          amount: '600.00',
          previousBalance: '0.00',
          subsequentBalance: '600.00',
          paymentId: 'pay-1',
          userId: 'user-1',
        }),
      );
    });

    it('restores only the applied amount: earlier payments keep the invoice PARCIAL', async () => {
      // original 300, pagó 50 antes (250), este cobro aplicó 100 (150 restante)
      const ar = account(
        'ar-1',
        '300.00',
        '150.00',
        AccountReceivableStatus.PARCIAL,
      );
      const { txManager } = setup([ar]);

      await service.reversePayment(
        txManager as any,
        input([{ accountReceivableId: 'ar-1', amount: '100.00' }]),
      );

      expect(ar.currentBalance).toBe('250.00');
      expect(ar.status).toBe(AccountReceivableStatus.PARCIAL);
    });

    it('writes one movement per allocation', async () => {
      const { txManager, armRepo } = setup([
        account('ar-1', '600.00', '0.00'),
        account('ar-2', '400.00', '0.00'),
      ]);
      await service.reversePayment(
        txManager as any,
        input([
          { accountReceivableId: 'ar-1', amount: '600.00' },
          { accountReceivableId: 'ar-2', amount: '400.00' },
        ]),
      );
      expect(armRepo.save).toHaveBeenCalledTimes(2);
    });

    it('fails with CHECK_REVERSAL_INCONSISTENCY when the balance would exceed the original', async () => {
      const ar = account(
        'ar-1',
        '300.00',
        '250.00',
        AccountReceivableStatus.PARCIAL,
      );
      const { txManager, arRepo, armRepo } = setup([ar]);

      const err = await service
        .reversePayment(
          txManager as any,
          input([{ accountReceivableId: 'ar-1', amount: '100.00' }]),
        )
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: CheckErrorCode.CHECK_REVERSAL_INCONSISTENCY,
      });
      expect(arRepo.save).not.toHaveBeenCalled();
      expect(armRepo.save).not.toHaveBeenCalled();
    });

    it('fails when an allocated account no longer exists', async () => {
      const { txManager } = setup([]);
      await expect(
        service.reversePayment(
          txManager as any,
          input([{ accountReceivableId: 'ar-1', amount: '10.00' }]),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('requires an active transaction', async () => {
      const { txManager } = setup([account('ar-1', '10.00', '0.00')], false);
      await expect(
        service.reversePayment(
          txManager as any,
          input([{ accountReceivableId: 'ar-1', amount: '10.00' }]),
        ),
      ).rejects.toThrow('active transaction');
    });
  });
});

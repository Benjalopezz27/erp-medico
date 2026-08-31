import { AccountReceivableStatus } from '@erp/shared-types';
import { AccountReceivable } from './entities/account-receivable.entity';
import { ReceivablesService } from './receivables.service';

describe('ReceivablesService', () => {
  const repository = {
    create: jest.fn((value) => ({ id: 'debt-1', ...value })),
    save: jest.fn(async (value) => value),
  };
  const manager = {
    queryRunner: { isTransactionActive: true },
    getRepository: jest.fn((entity) => {
      expect(entity).toBe(AccountReceivable);
      return repository;
    }),
  };
  const service = new ReceivablesService();

  beforeEach(() => jest.clearAllMocks());

  it('creates the minimal debt in the supplied transaction', async () => {
    const result = await service.recordCreditSaleDebt(manager as any, {
      customerId: 'customer-1',
      saleId: 'sale-1',
      fiscalDocumentId: 'fiscal-1',
      saleNumber: 'V-00000001',
      totalGross: '121.00',
    });

    expect(result).toMatchObject({
      originalAmount: '121.00',
      currentBalance: '121.00',
      status: AccountReceivableStatus.PENDIENTE,
      dueDate: null,
    });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a manager without an active transaction', async () => {
    await expect(
      service.recordCreditSaleDebt(
        { ...manager, queryRunner: { isTransactionActive: false } } as any,
        {
          customerId: 'customer-1',
          saleId: 'sale-1',
          fiscalDocumentId: 'fiscal-1',
          saleNumber: 'V-00000001',
          totalGross: '121.00',
        },
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

    it('throws ConflictException if credit note amount exceeds remaining balance', async () => {
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
      };
      const armRepo = {
        findOne: jest.fn(async () => null),
      };
      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn((entity) => {
          if (entity.name === 'AccountReceivable') return arRepo;
          return armRepo;
        }),
      };

      await expect(
        service.recordCreditNoteCompensation(txManager as any, {
          saleId: 'sale-1',
          saleReturnId: 'ret-1',
          fiscalDocumentId: 'fiscal-nc-1',
          creditNoteAmount: '150.00',
          userId: 'user-1',
        }),
      ).rejects.toThrow(
        'El monto de la nota de crédito no puede exceder el saldo pendiente',
      );
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
});

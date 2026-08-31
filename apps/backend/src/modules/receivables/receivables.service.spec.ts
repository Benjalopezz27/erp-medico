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
});

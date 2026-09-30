import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { Customer } from '../customers/entities/customer.entity';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Receipt } from './entities/receipt.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService.register', () => {
  const saved: { entity: unknown; value: any }[] = [];
  const repo = (entity: unknown) => ({
    findOne: jest.fn(async () => (entity === Customer ? { id: 'c-1' } : null)),
    create: jest.fn((v) => ({ id: `${(entity as any).name}-1`, ...v })),
    save: jest.fn(async (v) => {
      saved.push({ entity, value: v });
      return v;
    }),
  });
  const repos = new Map<unknown, ReturnType<typeof repo>>();
  const manager = {
    queryRunner: { isTransactionActive: true },
    getRepository: jest.fn((e) => {
      if (!repos.has(e)) repos.set(e, repo(e));
      return repos.get(e)!;
    }),
  };
  const dataSource = { transaction: jest.fn((cb) => cb(manager)) };
  const receivables = {
    applyPayment: jest.fn(async () => ({
      total: '250.00',
      applied: [
        { accountReceivableId: 'ar-1', amount: '150.00' },
        { accountReceivableId: 'ar-2', amount: '100.00' },
      ],
    })),
  };
  const receiptNumber = { next: jest.fn(async () => '0001-00000001') };
  const service = new PaymentsService(
    dataSource as any,
    receivables as any,
    receiptNumber as any,
  );

  const dto = {
    customerId: 'c-1',
    paymentMethod: PaymentMethod.EFECTIVO,
    mode: PaymentAllocationType.GLOBAL_AGE,
    totalAmount: '250.00',
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    saved.length = 0;
    repos.clear();
  });

  it('creates payment, allocations, movements and receipt in one transaction', async () => {
    const res = await service.register({ ...dto }, 'user-1');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(receivables.applyPayment).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        customerId: 'c-1',
        userId: 'user-1',
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '250.00',
        paymentId: 'Payment-1',
      }),
    );
    const allocations = saved
      .filter((s) => s.entity === PaymentAllocation)
      .map((s) => s.value);
    expect(allocations).toEqual([
      expect.objectContaining({
        accountReceivableId: 'ar-1',
        amountAllocated: '150.00',
        allocationType: PaymentAllocationType.GLOBAL_AGE,
      }),
      expect.objectContaining({
        accountReceivableId: 'ar-2',
        amountAllocated: '100.00',
      }),
    ]);
    expect(saved.find((s) => s.entity === Receipt)?.value).toMatchObject({
      receiptNumber: '0001-00000001',
      totalAmount: '250.00',
    });
    expect(saved.find((s) => s.entity === Payment)?.value).toMatchObject({
      totalAmount: '250.00',
    });
    expect(res.receipt.receiptNumber).toBe('0001-00000001');
  });

  it('does not consume a receipt number when applying the payment fails', async () => {
    receivables.applyPayment.mockRejectedValueOnce(new BadRequestException());
    await expect(service.register({ ...dto }, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(receiptNumber.next).not.toHaveBeenCalled();
    expect(saved.some((s) => s.entity === Receipt)).toBe(false);
  });

  it('rejects CHEQUE (and any non cash/transfer method) with 400', async () => {
    for (const paymentMethod of [PaymentMethod.CHEQUE, PaymentMethod.CTA_CTE]) {
      await expect(
        service.register({ ...dto, paymentMethod }, 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects amounts with more than 2 decimals with 400', async () => {
    await expect(
      service.register({ ...dto, totalAmount: '10.001' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when the customer does not exist', async () => {
    repos.set(Customer, {
      ...repo(Customer),
      findOne: jest.fn(async () => null),
    });
    await expect(service.register({ ...dto }, 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(receivables.applyPayment).not.toHaveBeenCalled();
  });
});

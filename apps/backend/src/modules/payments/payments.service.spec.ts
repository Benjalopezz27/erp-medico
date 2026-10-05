import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckErrorCode,
  CheckStatus,
  PaymentAllocationType,
  PaymentMethod,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { Check } from '../checks/entities/check.entity';
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
  const treasury = { recordMovement: jest.fn() };
  const service = new PaymentsService(
    dataSource as any,
    receivables as any,
    receiptNumber as any,
    treasury as any,
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

  describe('treasury movement', () => {
    it.each([
      [PaymentMethod.EFECTIVO, TreasuryAccountType.EFECTIVO],
      [PaymentMethod.TRANSFERENCIA, TreasuryAccountType.BANCOS],
    ])('records an income for %s in %s', async (paymentMethod, accountType) => {
      await service.register({ ...dto, paymentMethod }, 'user-1');
      expect(treasury.recordMovement).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          accountType,
          movementType: TreasuryMovementType.INGRESO,
          amount: '250.00',
          referenceType: 'PAYMENT',
          referenceId: 'Payment-1',
          userId: 'user-1',
        }),
      );
    });

    it('rolls back the payment when the movement fails', async () => {
      treasury.recordMovement.mockRejectedValueOnce(new Error('boom'));
      await expect(service.register({ ...dto }, 'user-1')).rejects.toThrow(
        'boom',
      );
    });
  });

  it('does not consume a receipt number when applying the payment fails', async () => {
    receivables.applyPayment.mockRejectedValueOnce(new BadRequestException());
    await expect(service.register({ ...dto }, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(receiptNumber.next).not.toHaveBeenCalled();
    expect(saved.some((s) => s.entity === Receipt)).toBe(false);
  });

  it('rejects methods other than cash/transfer/check with 400', async () => {
    await expect(
      service.register(
        { ...dto, paymentMethod: PaymentMethod.CTA_CTE },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  describe('CHEQUE', () => {
    const check = {
      bankName: 'Galicia',
      checkNumber: '12345678',
      drawerName: 'Juan Paz',
      dueDate: '2026-12-15',
    };
    const chequeDto = {
      ...dto,
      paymentMethod: PaymentMethod.CHEQUE,
      check,
    } as any;

    it('creates a RECIBIDO check for the applied total in the same transaction', async () => {
      await service.register(chequeDto, 'user-1');
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(saved.find((s) => s.entity === Check)?.value).toMatchObject({
        ...check,
        paymentId: 'Payment-1',
        customerId: 'c-1',
        amount: '250.00',
        status: CheckStatus.RECIBIDO,
      });
    });

    it('returns 400 CHECK_DATA_INVALID when the check is missing', async () => {
      await expect(
        service.register({ ...chequeDto, check: undefined }, 'user-1'),
      ).rejects.toMatchObject({
        response: { code: CheckErrorCode.CHECK_DATA_INVALID },
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('returns 400 CHECK_DATA_INVALID when a check comes with cash', async () => {
      await expect(
        service.register({ ...dto, check }, 'user-1'),
      ).rejects.toMatchObject({
        response: { code: CheckErrorCode.CHECK_DATA_INVALID },
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('returns 409 CHECK_DUPLICATE on the bank + number unique violation', async () => {
      repos.set(Check, {
        ...repo(Check),
        save: jest.fn().mockRejectedValue(
          Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'UQ_checks_bank_number',
          }),
        ),
      });
      const err = await service
        .register(chequeDto, 'user-1')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: CheckErrorCode.CHECK_DUPLICATE,
      });
      expect(saved.some((s) => s.entity === Receipt)).toBe(false);
    });

    it('does not create the check when applying the payment fails', async () => {
      receivables.applyPayment.mockRejectedValueOnce(new BadRequestException());
      await expect(
        service.register(chequeDto, 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saved.some((s) => s.entity === Check)).toBe(false);
    });
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

import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  CheckErrorCode,
  CheckStatus,
  PaymentStatus,
} from '@erp/shared-types';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ChecksService } from './checks.service';
import { Check } from './entities/check.entity';

describe('ChecksService transitions', () => {
  let check: Partial<Check> | null;
  let supplierExists: boolean;
  const saved: Partial<Check>[] = [];
  const findOne = jest.fn();
  const paymentUpdate: jest.Mock = jest.fn(async () => ({}));
  const allocations = [
    { accountReceivableId: 'ar-1', amountAllocated: '600.00' },
    { accountReceivableId: 'ar-2', amountAllocated: '400.00' },
  ];
  const manager = {
    queryRunner: { isTransactionActive: true },
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Supplier) {
        return {
          findOne: jest.fn(async () => (supplierExists ? { id: 's-1' } : null)),
        };
      }
      if (entity === PaymentAllocation) {
        return { find: jest.fn(async () => allocations) };
      }
      if (entity === Payment) return { update: paymentUpdate };
      return {
        findOne,
        save: jest.fn(async (v: Partial<Check>) => {
          saved.push({ ...v });
          return v;
        }),
      };
    }),
  };
  const dataSource = { transaction: jest.fn((cb) => cb(manager)) };
  const audit = { record: jest.fn(async () => ({})) };
  const receivables = {
    reversePayment: jest.fn(async () => ({
      lines: [],
      totalIncrease: '1000.00',
    })) as jest.Mock,
  };
  const service = new ChecksService(
    dataSource as any,
    audit as any,
    receivables as any,
  );

  const withStatus = (status: CheckStatus) => {
    check = {
      id: 'k-1',
      paymentId: 'p-1',
      status,
      endorsedToSupplierId: null,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    saved.length = 0;
    supplierExists = true;
    findOne.mockImplementation(async () => check);
  });

  it('walks RECIBIDO -> EN_CARTERA -> DEPOSITADO and audits each step', async () => {
    withStatus(CheckStatus.RECIBIDO);
    await service.toCartera('k-1', 'u-1');
    expect(check?.status).toBe(CheckStatus.EN_CARTERA);
    await service.deposit('k-1', 'u-1');
    expect(check?.status).toBe(CheckStatus.DEPOSITADO);
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenLastCalledWith(
      manager,
      expect.objectContaining({
        actorId: 'u-1',
        action: AuditAction.UPDATE,
        entityName: 'Check',
        entityId: 'k-1',
        previousValues: { status: CheckStatus.EN_CARTERA },
        newValues: { status: CheckStatus.DEPOSITADO },
      }),
    );
  });

  it('endorses an EN_CARTERA check to an existing supplier', async () => {
    withStatus(CheckStatus.EN_CARTERA);
    await service.endorse('k-1', 's-1', 'u-1');
    expect(check).toMatchObject({
      status: CheckStatus.ENDOSADO,
      endorsedToSupplierId: 's-1',
    });
  });

  it('returns 404 and leaves the check untouched for an unknown supplier', async () => {
    withStatus(CheckStatus.EN_CARTERA);
    supplierExists = false;
    await expect(service.endorse('k-1', 's-x', 'u-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(saved).toHaveLength(0);
  });

  it('returns 404 for an unknown check', async () => {
    check = null;
    await expect(service.deposit('k-x', 'u-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  const invalid: [string, CheckStatus][] = [
    ['toCartera', CheckStatus.EN_CARTERA],
    ['toCartera', CheckStatus.DEPOSITADO],
    ['deposit', CheckStatus.RECIBIDO],
    ['deposit', CheckStatus.DEPOSITADO],
    ['endorse', CheckStatus.RECIBIDO],
    ['endorse', CheckStatus.DEPOSITADO],
    ['endorse', CheckStatus.ENDOSADO],
    ['deposit', CheckStatus.RECHAZADO],
    ['reject', CheckStatus.RECIBIDO],
    ['reject', CheckStatus.ENDOSADO],
    ['reject', CheckStatus.RECHAZADO],
  ];
  it.each(invalid)(
    '%s from %s answers 409 and changes nothing',
    async (action, from) => {
      withStatus(from);
      const call =
        action === 'endorse'
          ? service.endorse('k-1', 's-1', 'u-1')
          : (service as any)[action]('k-1', 'u-1');
      const err = await call.catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse()).toMatchObject({
        code: CheckErrorCode.CHECK_INVALID_TRANSITION,
      });
      expect(saved).toHaveLength(0);
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it('locks the check row so concurrent transitions serialize', async () => {
    withStatus(CheckStatus.EN_CARTERA);
    await service.deposit('k-1', 'u-1');
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  describe('reject', () => {
    it.each([CheckStatus.EN_CARTERA, CheckStatus.DEPOSITADO])(
      'reverses the payment, marks the check RECHAZADO and audits check and payment from %s',
      async (from) => {
        withStatus(from);
        await service.reject('k-1', 'Sin fondos', 'u-1');

        expect(receivables.reversePayment).toHaveBeenCalledWith(manager, {
          paymentId: 'p-1',
          userId: 'u-1',
          allocations: [
            { accountReceivableId: 'ar-1', amount: '600.00' },
            { accountReceivableId: 'ar-2', amount: '400.00' },
          ],
        });
        expect(check).toMatchObject({
          status: CheckStatus.RECHAZADO,
          rejectionReason: 'Sin fondos',
        });
        expect(check?.rejectedAt).toBeInstanceOf(Date);
        expect(paymentUpdate).toHaveBeenCalledWith(
          { id: 'p-1' },
          { status: PaymentStatus.REVERTIDO },
        );
        expect(audit.record).toHaveBeenCalledTimes(2);
        expect(audit.record).toHaveBeenCalledWith(
          manager,
          expect.objectContaining({
            entityName: 'Payment',
            entityId: 'p-1',
            previousValues: { status: PaymentStatus.REGISTRADO },
            newValues: { status: PaymentStatus.REVERTIDO },
          }),
        );
      },
    );

    it('leaves the check untouched when the reversal fails', async () => {
      withStatus(CheckStatus.EN_CARTERA);
      receivables.reversePayment.mockRejectedValueOnce(new ConflictException());
      await expect(
        service.reject('k-1', undefined, 'u-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(saved).toHaveLength(0);
      expect(paymentUpdate).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});

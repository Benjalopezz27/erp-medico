import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckErrorCode,
  CheckStatus,
  IRegisterPaymentResponse,
  PaymentAllocationType,
  PaymentErrorCode,
  PaymentMethod,
  TreasuryMovementType,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import {
  assertSameRequest,
  hashRequest,
  lockIdempotencyKey,
} from '../../common/utils/idempotency.utils';
import { accountForPaymentMethod } from '../treasury/payment-method-account';
import { TreasuryService } from '../treasury/treasury.service';
import { Check } from '../checks/entities/check.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ReceivablesService } from '../receivables/receivables.service';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Receipt } from './entities/receipt.entity';
import { ReceiptNumberService } from './receipt-number.service';

const SUPPORTED_METHODS = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.TRANSFERENCIA,
  PaymentMethod.CHEQUE,
];

const CHECK_UNIQUE_CONSTRAINT = 'UQ_checks_bank_number';

function isCheckDuplicate(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return e?.code === '23505' && e.constraint === CHECK_UNIQUE_CONSTRAINT;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly receivables: ReceivablesService,
    private readonly receiptNumbers: ReceiptNumberService,
    private readonly treasury: TreasuryService,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'payments', status: 'initialized' };
  }

  async register(
    dto: RegisterPaymentDto,
    userId: string,
  ): Promise<IRegisterPaymentResponse> {
    if (!SUPPORTED_METHODS.includes(dto.paymentMethod)) {
      throw new BadRequestException({
        code: PaymentErrorCode.PAYMENT_METHOD_NOT_SUPPORTED,
        message: 'Solo se admite cobro en efectivo, transferencia o cheque.',
      });
    }
    if ((dto.paymentMethod === PaymentMethod.CHEQUE) !== !!dto.check) {
      throw new BadRequestException({
        code: CheckErrorCode.CHECK_DATA_INVALID,
        message:
          'Los datos del cheque son obligatorios con medio CHEQUE y no se admiten con otro medio.',
      });
    }
    if (
      dto.mode === PaymentAllocationType.GLOBAL_AGE &&
      new Decimal(dto.totalAmount ?? 'NaN').decimalPlaces() > 2
    ) {
      throw new BadRequestException({
        code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
        message: 'El monto cobrado admite hasta 2 decimales.',
      });
    }

    const { idempotencyKey, ...body } = dto;
    const requestHash = hashRequest(body);

    return this.dataSource.transaction(async (manager) => {
      if (idempotencyKey) {
        await lockIdempotencyKey(manager, 'payment', userId, idempotencyKey);
        const existing = await manager.getRepository(Payment).findOne({
          where: { userId, idempotencyKey },
          relations: ['receipt'],
        });
        if (existing) {
          assertSameRequest(
            existing,
            requestHash,
            PaymentErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT,
          );
          return { payment: existing, receipt: existing.receipt! };
        }
      }

      const customer = await manager
        .getRepository(Customer)
        .findOne({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException('Cliente no encontrado.');

      const paymentRepo = manager.getRepository(Payment);
      // El pago se inserta antes de aplicar (los movimientos lo referencian),
      // así que el total se calcula del pedido; applyPayment valida cada monto.
      const requested =
        dto.mode === PaymentAllocationType.GLOBAL_AGE
          ? new Decimal(dto.totalAmount as string)
          : (dto.allocations ?? []).reduce(
              (sum, a) => sum.plus(a.amount),
              new Decimal(0),
            );
      if (!requested.greaterThan(0)) {
        throw new BadRequestException({
          code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
          message: 'El total cobrado debe ser mayor a 0.',
        });
      }
      const payment = await paymentRepo.save(
        paymentRepo.create({
          customerId: dto.customerId,
          totalAmount: requested.toFixed(2),
          paymentMethod: dto.paymentMethod,
          notes: dto.notes ?? null,
          userId,
          idempotencyKey: idempotencyKey ?? null,
          requestHash: idempotencyKey ? requestHash : null,
        }),
      );

      const applied = await this.receivables.applyPayment(manager, {
        paymentId: payment.id,
        customerId: dto.customerId,
        userId,
        ...(dto.mode === PaymentAllocationType.GLOBAL_AGE
          ? {
              mode: PaymentAllocationType.GLOBAL_AGE as const,
              totalAmount: dto.totalAmount as string,
            }
          : {
              mode: PaymentAllocationType.DIRECTED as const,
              allocations: dto.allocations ?? [],
            }),
      });

      const allocationRepo = manager.getRepository(PaymentAllocation);
      for (const line of applied.applied) {
        await allocationRepo.save(
          allocationRepo.create({
            paymentId: payment.id,
            accountReceivableId: line.accountReceivableId,
            amountAllocated: line.amount,
            allocationType: dto.mode,
          }),
        );
      }

      if (dto.check) {
        const checkRepo = manager.getRepository(Check);
        try {
          await checkRepo.save(
            checkRepo.create({
              ...dto.check,
              issueDate: dto.check.issueDate ?? null,
              paymentId: payment.id,
              customerId: dto.customerId,
              amount: applied.total,
              status: CheckStatus.RECIBIDO,
            }),
          );
        } catch (err) {
          if (isCheckDuplicate(err)) {
            throw new ConflictException({
              code: CheckErrorCode.CHECK_DUPLICATE,
              message: 'Ya existe un cheque con ese banco y número.',
            });
          }
          throw err;
        }
      }

      const receiptRepo = manager.getRepository(Receipt);
      const receipt = await receiptRepo.save(
        receiptRepo.create({
          receiptNumber: await this.receiptNumbers.next(manager),
          paymentId: payment.id,
          customerId: dto.customerId,
          totalAmount: applied.total,
          userId,
        }),
      );

      await this.treasury.recordMovement(manager, {
        accountType: accountForPaymentMethod(dto.paymentMethod)!,
        movementType: TreasuryMovementType.INGRESO,
        amount: applied.total,
        concept: `Cobro - Recibo ${receipt.receiptNumber}`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        userId,
      });

      return { payment, receipt };
    });
  }
}

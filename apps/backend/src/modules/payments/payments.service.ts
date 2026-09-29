import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IRegisterPaymentResponse,
  PaymentAllocationType,
  PaymentErrorCode,
  PaymentMethod,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { ReceivablesService } from '../receivables/receivables.service';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Receipt } from './entities/receipt.entity';
import { ReceiptNumberService } from './receipt-number.service';

const SUPPORTED_METHODS = [PaymentMethod.EFECTIVO, PaymentMethod.TRANSFERENCIA];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly receivables: ReceivablesService,
    private readonly receiptNumbers: ReceiptNumberService,
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
        message: 'Solo se admite cobro en efectivo o transferencia.',
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

    return this.dataSource.transaction(async (manager) => {
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

      return { payment, receipt };
    });
  }
}

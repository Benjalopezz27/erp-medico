import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  CheckErrorCode,
  ICheckRejectionImpactLine,
  PaymentAllocationType,
  PaymentErrorCode,
  SalesErrorCode,
  SaleReturnErrorCode,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';
import { AccountReceivableMovement } from './entities/account-receivable-movement.entity';

export type ApplyPaymentInput = {
  paymentId: string;
  customerId: string;
  userId: string;
} & (
  | {
      mode: PaymentAllocationType.DIRECTED;
      allocations: { accountReceivableId: string; amount: string }[];
    }
  | { mode: PaymentAllocationType.GLOBAL_AGE; totalAmount: string }
);

export interface ApplyPaymentResult {
  total: string;
  applied: { accountReceivableId: string; amount: string }[];
}

export interface ReversePaymentInput {
  paymentId: string;
  userId: string;
  /** Montos realmente aplicados por el cobro (PaymentAllocation). */
  allocations: { accountReceivableId: string; amount: string }[];
}

export interface ReversePaymentResult {
  lines: ICheckRejectionImpactLine[];
  totalIncrease: string;
}

type ReversibleAccount = Pick<
  AccountReceivable,
  'id' | 'documentReference' | 'originalAmount' | 'currentBalance'
>;

const inconsistency = (message: string) =>
  new ConflictException({
    code: CheckErrorCode.CHECK_REVERSAL_INCONSISTENCY,
    message,
  });

/**
 * Calcula cómo queda cada cuenta al revertir un cobro: repone el monto
 * aplicado (no `originalAmount`, para no borrar pagos o notas de crédito
 * previos). Única fuente de verdad de la reversión y del impacto previsto.
 */
export function planReversal(
  accounts: ReversibleAccount[],
  allocations: { accountReceivableId: string; amount: string }[],
): ReversePaymentResult {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  let totalIncrease = new Decimal(0);
  const lines = allocations.map(({ accountReceivableId, amount }) => {
    const account = byId.get(accountReceivableId);
    if (!account) {
      throw inconsistency(
        'Una factura del cobro ya no existe: no se puede revertir.',
      );
    }
    const restore = new Decimal(amount);
    const next = new Decimal(account.currentBalance).plus(restore);
    if (next.greaterThan(account.originalAmount)) {
      throw inconsistency(
        `Revertir el cobro deja la factura ${account.documentReference ?? account.id} con más saldo que su importe original.`,
      );
    }
    totalIncrease = totalIncrease.plus(restore);
    return {
      accountReceivableId,
      documentReference: account.documentReference ?? '',
      amountToRestore: restore.toFixed(2),
      resultingBalance: next.toFixed(2),
      resultingStatus: next.equals(account.originalAmount)
        ? AccountReceivableStatus.PENDIENTE
        : AccountReceivableStatus.PARCIAL,
    };
  });
  return { lines, totalIncrease: totalIncrease.toFixed(2) };
}

function positiveMoney(value: string, field: string): Decimal {
  let amount: Decimal;
  try {
    amount = new Decimal(value);
  } catch {
    throw new BadRequestException({
      code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
      message: `${field} no es un importe válido.`,
    });
  }
  if (!amount.greaterThan(0) || amount.decimalPlaces() > 2) {
    throw new BadRequestException({
      code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
      message: `${field} debe ser mayor a 0 y tener hasta 2 decimales.`,
    });
  }
  return amount;
}

@Injectable()
export class ReceivablesService {
  getStatus(): { module: string; status: string } {
    return { module: 'receivables', status: 'initialized' };
  }

  async recordCreditSaleDebt(
    manager: EntityManager,
    input: {
      customerId: string;
      saleId: string;
      fiscalDocumentId: string;
      saleNumber: string;
      totalGross: string;
      userId: string;
    },
  ): Promise<AccountReceivable> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceivablesService.recordCreditSaleDebt requires an active transaction.',
      );
    }
    const total = new Decimal(input.totalGross);
    if (!total.greaterThan(0)) {
      throw new Error(
        'ReceivablesService.recordCreditSaleDebt requires a positive total.',
      );
    }
    const amount = total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);

    await this.assertWithinCreditLimit(manager, input.customerId, amount);

    const repository = manager.getRepository(AccountReceivable);
    const accountReceivable = await repository.save(
      repository.create({
        customerId: input.customerId,
        saleId: input.saleId,
        fiscalDocumentId: input.fiscalDocumentId,
        documentReference: input.saleNumber,
        originalAmount: amount,
        currentBalance: amount,
        status: AccountReceivableStatus.PENDIENTE,
        dueDate: null,
      }),
    );

    const movementRepo = manager.getRepository(AccountReceivableMovement);
    await movementRepo.save(
      movementRepo.create({
        accountReceivableId: accountReceivable.id,
        movementType: AccountReceivableMovementType.FACTURA,
        amount,
        previousBalance: '0.00',
        subsequentBalance: amount,
        fiscalDocumentId: input.fiscalDocumentId,
        userId: input.userId,
      }),
    );

    return accountReceivable;
  }

  /**
   * Locks the customer row so concurrent credit sales are checked one at a
   * time against the same balance. creditLimit 0 means "no limit configured".
   */
  private async assertWithinCreditLimit(
    manager: EntityManager,
    customerId: string,
    amount: string,
  ): Promise<void> {
    const [customer] = await manager.query<{ credit_limit: string }[]>(
      'SELECT credit_limit FROM customers WHERE id = $1 FOR UPDATE',
      [customerId],
    );
    const limit = new Decimal(customer?.credit_limit ?? 0);
    if (!limit.greaterThan(0)) return;

    const [{ balance }] = await manager.query<{ balance: string }[]>(
      `SELECT COALESCE(SUM(current_balance), 0) AS balance
       FROM account_receivables
       WHERE customer_id = $1 AND status <> $2`,
      [customerId, AccountReceivableStatus.CANCELADO],
    );
    if (new Decimal(balance).plus(amount).greaterThan(limit)) {
      throw new ConflictException({
        code: SalesErrorCode.SALE_CREDIT_LIMIT_EXCEEDED,
        message: `La venta supera el límite de crédito del cliente (${limit.toFixed(2)}).`,
      });
    }
  }

  async recordCreditNoteCompensation(
    manager: EntityManager,
    input: {
      saleId: string;
      saleReturnId: string;
      fiscalDocumentId: string | null;
      creditNoteAmount: string;
      userId: string;
    },
  ): Promise<{
    movement: AccountReceivableMovement;
    accountReceivable: AccountReceivable;
  } | null> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceivablesService.recordCreditNoteCompensation requires an active transaction.',
      );
    }

    const receivableRepo = manager.getRepository(AccountReceivable);
    const movementRepo = manager.getRepository(AccountReceivableMovement);

    const accountReceivable = await receivableRepo
      .createQueryBuilder('ar')
      .setLock('pessimistic_write')
      .where('ar.saleId = :saleId', { saleId: input.saleId })
      .getOne();

    if (!accountReceivable) {
      return null;
    }

    const existingMovement = await movementRepo.findOne({
      where: { saleReturnId: input.saleReturnId },
    });
    if (existingMovement) {
      return { movement: existingMovement, accountReceivable };
    }

    const creditAmount = new Decimal(input.creditNoteAmount);
    const prevBalance = new Decimal(accountReceivable.currentBalance);

    if (creditAmount.greaterThan(prevBalance)) {
      throw new ConflictException({
        code: SaleReturnErrorCode.SALE_RETURN_RECEIVABLE_INCONSISTENCY,
        message:
          'El monto de la nota de crédito no puede exceder el saldo pendiente de la cuenta corriente.',
      });
    }

    const nextBalance = prevBalance
      .minus(creditAmount)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    accountReceivable.currentBalance = nextBalance.toFixed(2);
    accountReceivable.status = nextBalance.isZero()
      ? AccountReceivableStatus.CANCELADO
      : AccountReceivableStatus.PARCIAL;

    await receivableRepo.save(accountReceivable);

    const movement = await movementRepo.save(
      movementRepo.create({
        accountReceivableId: accountReceivable.id,
        movementType: AccountReceivableMovementType.NOTA_CREDITO,
        amount: creditAmount.toFixed(2),
        previousBalance: prevBalance.toFixed(2),
        subsequentBalance: nextBalance.toFixed(2),
        fiscalDocumentId: input.fiscalDocumentId,
        saleReturnId: input.saleReturnId,
        userId: input.userId,
      }),
    );

    return { movement, accountReceivable };
  }

  /**
   * Aplica un cobro a las facturas del cliente y escribe un movimiento PAGO
   * por cada una. Bloquea las cuentas involucradas; el llamador decide el
   * commit, así que cualquier error deja todo sin cambios.
   */
  async applyPayment(
    manager: EntityManager,
    input: ApplyPaymentInput,
  ): Promise<ApplyPaymentResult> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceivablesService.applyPayment requires an active transaction.',
      );
    }
    const receivableRepo = manager.getRepository(AccountReceivable);
    const movementRepo = manager.getRepository(AccountReceivableMovement);

    // Cada asignación: cuenta bloqueada + monto a aplicar.
    let plan: { account: AccountReceivable; amount: Decimal }[];

    if (input.mode === PaymentAllocationType.DIRECTED) {
      const ids = input.allocations.map((a) => a.accountReceivableId);
      if (ids.length === 0 || new Set(ids).size !== ids.length) {
        throw new BadRequestException({
          code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
          message: 'La lista de facturas está vacía o tiene repetidas.',
        });
      }
      const amounts = new Map(
        input.allocations.map((a) => [
          a.accountReceivableId,
          positiveMoney(a.amount, 'El monto a aplicar'),
        ]),
      );
      const accounts = await receivableRepo
        .createQueryBuilder('ar')
        .setLock('pessimistic_write')
        .where('ar.id IN (:...ids)', { ids })
        .orderBy('ar.id', 'ASC')
        .getMany();
      if (
        accounts.length !== ids.length ||
        accounts.some((a) => a.customerId !== input.customerId)
      ) {
        throw new BadRequestException({
          code: PaymentErrorCode.PAYMENT_INVALID_ALLOCATION,
          message: 'Alguna factura no existe o no pertenece al cliente.',
        });
      }
      plan = accounts.map((account) => ({
        account,
        amount: amounts.get(account.id) as Decimal,
      }));
      for (const { account, amount } of plan) {
        if (amount.greaterThan(account.currentBalance)) {
          throw new ConflictException({
            code: PaymentErrorCode.PAYMENT_AMOUNT_EXCEEDS_BALANCE,
            message: `El monto excede el saldo de la factura ${account.documentReference ?? account.id}.`,
          });
        }
      }
    } else {
      let remaining = positiveMoney(input.totalAmount, 'El monto cobrado');
      const accounts = await receivableRepo
        .createQueryBuilder('ar')
        .setLock('pessimistic_write')
        .where('ar.customerId = :customerId', { customerId: input.customerId })
        .andWhere('ar.currentBalance > 0')
        .orderBy('ar.createdAt', 'ASC')
        .addOrderBy('ar.id', 'ASC')
        .getMany();
      const debt = accounts.reduce(
        (sum, a) => sum.plus(a.currentBalance),
        new Decimal(0),
      );
      if (remaining.greaterThan(debt)) {
        throw new ConflictException({
          code: PaymentErrorCode.PAYMENT_AMOUNT_EXCEEDS_BALANCE,
          message: 'El monto cobrado excede el saldo total del cliente.',
        });
      }
      plan = [];
      for (const account of accounts) {
        if (!remaining.greaterThan(0)) break;
        const amount = Decimal.min(remaining, account.currentBalance);
        plan.push({ account, amount });
        remaining = remaining.minus(amount);
      }
    }

    const applied: ApplyPaymentResult['applied'] = [];
    let total = new Decimal(0);
    for (const { account, amount } of plan) {
      const previous = new Decimal(account.currentBalance);
      const next = previous.minus(amount);
      account.currentBalance = next.toFixed(2);
      account.status = next.isZero()
        ? AccountReceivableStatus.CANCELADO
        : AccountReceivableStatus.PARCIAL;
      await receivableRepo.save(account);
      await movementRepo.save(
        movementRepo.create({
          accountReceivableId: account.id,
          movementType: AccountReceivableMovementType.PAGO,
          amount: amount.toFixed(2),
          previousBalance: previous.toFixed(2),
          subsequentBalance: next.toFixed(2),
          paymentId: input.paymentId,
          userId: input.userId,
        }),
      );
      applied.push({
        accountReceivableId: account.id,
        amount: amount.toFixed(2),
      });
      total = total.plus(amount);
    }
    return { total: total.toFixed(2), applied };
  }

  /**
   * Revierte la aplicación de un cobro (cheque rechazado): repone los saldos
   * y escribe un movimiento REVERSION_CHEQUE por factura. Bloquea las cuentas
   * en el mismo orden que `applyPayment`; el llamador decide el commit.
   */
  async reversePayment(
    manager: EntityManager,
    input: ReversePaymentInput,
  ): Promise<ReversePaymentResult> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceivablesService.reversePayment requires an active transaction.',
      );
    }
    const receivableRepo = manager.getRepository(AccountReceivable);
    const movementRepo = manager.getRepository(AccountReceivableMovement);

    const ids = input.allocations.map((a) => a.accountReceivableId);
    const accounts = await receivableRepo
      .createQueryBuilder('ar')
      .setLock('pessimistic_write')
      .where('ar.id IN (:...ids)', { ids })
      .orderBy('ar.id', 'ASC')
      .getMany();
    const result = planReversal(accounts, input.allocations);

    const byId = new Map(accounts.map((a) => [a.id, a]));
    for (const line of result.lines) {
      const account = byId.get(line.accountReceivableId) as AccountReceivable;
      const previous = account.currentBalance;
      account.currentBalance = line.resultingBalance;
      account.status = line.resultingStatus;
      await receivableRepo.save(account);
      await movementRepo.save(
        movementRepo.create({
          accountReceivableId: account.id,
          movementType: AccountReceivableMovementType.REVERSION_CHEQUE,
          amount: line.amountToRestore,
          previousBalance: previous,
          subsequentBalance: line.resultingBalance,
          paymentId: input.paymentId,
          userId: input.userId,
        }),
      );
    }
    return result;
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  SaleReturnErrorCode,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';
import { AccountReceivableMovement } from './entities/account-receivable-movement.entity';

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
    },
  ): Promise<AccountReceivable> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceivablesService.recordCreditSaleDebt requires an active transaction.',
      );
    }
    const repository = manager.getRepository(AccountReceivable);
    return repository.save(
      repository.create({
        customerId: input.customerId,
        saleId: input.saleId,
        fiscalDocumentId: input.fiscalDocumentId,
        documentReference: input.saleNumber,
        originalAmount: input.totalGross,
        currentBalance: input.totalGross,
        status: AccountReceivableStatus.PENDIENTE,
        dueDate: null,
      }),
    );
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
}

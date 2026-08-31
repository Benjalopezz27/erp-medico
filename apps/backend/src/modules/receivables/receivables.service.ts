import { Injectable } from '@nestjs/common';
import { AccountReceivableStatus } from '@erp/shared-types';
import { EntityManager } from 'typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';

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
}

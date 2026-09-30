import { Injectable, NotFoundException } from '@nestjs/common';
import { IReceiptDetail } from '@erp/shared-types';
import { DataSource } from 'typeorm';
import { Check } from '../checks/entities/check.entity';
import { Receipt } from './entities/receipt.entity';

@Injectable()
export class ReceiptsService {
  constructor(private readonly dataSource: DataSource) {}

  async getDetail(id: string): Promise<IReceiptDetail> {
    const receipt = await this.dataSource.getRepository(Receipt).findOne({
      where: { id },
      relations: {
        customer: true,
        payment: { allocations: { accountReceivable: true } },
      },
    });
    if (!receipt?.payment || !receipt.customer) {
      throw new NotFoundException('Recibo no encontrado.');
    }
    const { payment, customer } = receipt;
    const check = await this.dataSource
      .getRepository(Check)
      .findOne({ where: { paymentId: payment.id } });
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      paymentId: payment.id,
      createdAt: receipt.createdAt,
      customerId: customer.id,
      customerName: customer.businessName,
      customerDocument: customer.cuitOrDni,
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.status,
      check: check
        ? { bankName: check.bankName, checkNumber: check.checkNumber }
        : null,
      notes: payment.notes,
      applied: (payment.allocations ?? [])
        .map((a) => ({
          accountReceivableId: a.accountReceivableId,
          documentReference: a.accountReceivable?.documentReference ?? '',
          invoiceDate: a.accountReceivable?.createdAt as Date,
          originalAmount: a.accountReceivable?.originalAmount ?? '0.00',
          amountApplied: a.amountAllocated,
        }))
        .sort((x, y) => +new Date(x.invoiceDate) - +new Date(y.invoiceDate)),
      totalAmount: receipt.totalAmount,
    };
  }
}

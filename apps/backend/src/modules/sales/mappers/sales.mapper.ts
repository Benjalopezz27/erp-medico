import Decimal from 'decimal.js';
import { AccountReceivable } from '../../receivables/entities/account-receivable.entity';
import { Sale } from '../entities/sale.entity';
import { SaleResponseDto } from '../dto';

export class SalesMapper {
  static toResponse(
    sale: Sale,
    accountReceivable: AccountReceivable | null,
  ): SaleResponseDto {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerId: sale.customerId,
      status: sale.status,
      isCreditSale: sale.isCreditSale,
      requiresFiscalInvoice: sale.requiresFiscalInvoice,
      paymentMethod: sale.paymentMethod,
      totalNet: new Decimal(sale.totalNet).toFixed(2),
      taxableNet: new Decimal(sale.taxableNet).toFixed(2),
      exemptAmount: new Decimal(sale.exemptAmount).toFixed(2),
      nonTaxedAmount: new Decimal(sale.nonTaxedAmount).toFixed(2),
      ivaTotal: new Decimal(sale.ivaTotal).toFixed(2),
      totalGross: new Decimal(sale.totalGross).toFixed(2),
      userId: sale.userId,
      customer: sale.customer
        ? { id: sale.customer.id, businessName: sale.customer.businessName }
        : null,
      user: { id: sale.user?.id ?? sale.userId, name: sale.user?.name ?? '' },
      items: (sale.items ?? [])
        .sort((left, right) => left.itemIndex - right.itemIndex)
        .map((item) => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          itemIndex: item.itemIndex,
          quantityBase: new Decimal(item.quantityBase).toNumber(),
          catalogPriceNet: new Decimal(item.catalogPriceNet).toFixed(2),
          pricingRuleApplied: item.pricingRuleApplied,
          pricingRuleId: item.pricingRuleId,
          discountPercentage:
            item.discountPercentage === null
              ? null
              : new Decimal(item.discountPercentage).toFixed(4),
          discountAmountNet: new Decimal(item.discountAmountNet).toFixed(2),
          unitPriceNet: new Decimal(item.unitPriceNet).toFixed(2),
          subtotalNet: new Decimal(item.subtotalNet).toFixed(2),
          taxTreatment: item.taxTreatment,
          ivaPercentage:
            item.ivaPercentage === null
              ? null
              : new Decimal(item.ivaPercentage).toFixed(2),
          ivaAmount: new Decimal(item.ivaAmount).toFixed(2),
          subtotalGross: new Decimal(item.subtotalGross).toFixed(2),
          product: {
            id: item.product?.id ?? item.productId,
            internalCode: item.product?.internalCode ?? '',
            name: item.product?.name ?? '',
          },
        })),
      fiscalDocument: (() => {
        const doc = (sale.fiscalDocuments ?? []).find((d) => !d.saleReturnId) ?? null;
        if (!doc) return null;
        return {
          id: doc.id,
          saleId: doc.saleId,
          documentType: doc.documentType,
          pointOfSale: doc.pointOfSale,
          documentNumber: doc.documentNumber,
          arcaStatus: doc.arcaStatus,
          cae: doc.cae,
        };
      })(),
      accountReceivable: accountReceivable
        ? {
            id: accountReceivable.id,
            customerId: accountReceivable.customerId,
            saleId: accountReceivable.saleId,
            fiscalDocumentId: accountReceivable.fiscalDocumentId,
            documentReference: accountReceivable.documentReference,
            originalAmount: new Decimal(
              accountReceivable.originalAmount,
            ).toFixed(2),
            currentBalance: new Decimal(
              accountReceivable.currentBalance,
            ).toFixed(2),
            status: accountReceivable.status,
            dueDate: accountReceivable.dueDate,
          }
        : null,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }
}

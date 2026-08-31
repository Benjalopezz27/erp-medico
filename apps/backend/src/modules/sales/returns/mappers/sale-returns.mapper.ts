import Decimal from 'decimal.js';
import { SaleReturn } from '../entities/sale-return.entity';
import { SaleReturnResponseDto, SaleReturnItemResponseDto } from '../dto';

export class SaleReturnsMapper {
  static toResponse(saleReturn: SaleReturn): SaleReturnResponseDto {
    return {
      id: saleReturn.id,
      saleId: saleReturn.saleId,
      userId: saleReturn.userId,
      reason: saleReturn.reason,
      taxableNet: new Decimal(saleReturn.taxableNet || '0').toFixed(2),
      exemptAmount: new Decimal(saleReturn.exemptAmount || '0').toFixed(2),
      nonTaxedAmount: new Decimal(saleReturn.nonTaxedAmount || '0').toFixed(2),
      totalNet: new Decimal(saleReturn.totalNet || '0').toFixed(2),
      ivaTotal: new Decimal(saleReturn.ivaTotal || '0').toFixed(2),
      totalGross: new Decimal(saleReturn.totalGross || '0').toFixed(2),
      idempotencyKey: saleReturn.idempotencyKey,
      fiscalDocument: saleReturn.fiscalDocument
        ? {
            id: saleReturn.fiscalDocument.id,
            saleId: saleReturn.fiscalDocument.saleId,
            documentType: saleReturn.fiscalDocument.documentType,
            pointOfSale: saleReturn.fiscalDocument.pointOfSale,
            documentNumber: saleReturn.fiscalDocument.documentNumber,
            arcaStatus: saleReturn.fiscalDocument.arcaStatus,
            cae: saleReturn.fiscalDocument.cae,
          }
        : null,
      user: saleReturn.user
        ? {
            id: saleReturn.user.id,
            name: saleReturn.user.name,
          }
        : { id: saleReturn.userId, name: '' },
      items: (saleReturn.items ?? []).map((item) => this.toItemResponse(item)),
      createdAt:
        saleReturn.createdAt instanceof Date
          ? saleReturn.createdAt.toISOString()
          : String(saleReturn.createdAt),
    };
  }

  static toItemResponse(item: any): SaleReturnItemResponseDto {
    return {
      id: item.id,
      saleReturnId: item.saleReturnId,
      saleItemId: item.saleItemId,
      productId: item.productId,
      quantityBase: new Decimal(item.quantityBase || '0').toNumber(),
      quality: item.quality,
      unitPriceNet: new Decimal(item.unitPriceNet || '0').toFixed(2),
      taxTreatment: item.taxTreatment,
      ivaPercentage:
        item.ivaPercentage === null || item.ivaPercentage === undefined
          ? null
          : new Decimal(item.ivaPercentage).toFixed(2),
      subtotalNet: new Decimal(item.subtotalNet || '0').toFixed(2),
      ivaAmount: new Decimal(item.ivaAmount || '0').toFixed(2),
      subtotalGross: new Decimal(item.subtotalGross || '0').toFixed(2),
      stockMovementId: item.stockMovementId || null,
      quarantineStockId: item.quarantineStock?.id || null,
      notes: item.notes || null,
      product: item.product
        ? {
            id: item.product.id,
            internalCode: item.product.internalCode,
            name: item.product.name,
          }
        : undefined,
      createdAt:
        item.createdAt instanceof Date
          ? item.createdAt.toISOString()
          : String(item.createdAt),
    };
  }
}

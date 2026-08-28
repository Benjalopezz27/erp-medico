import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  ISupplierInvoiceDetail,
  PriceReviewStatus,
  StockMovementType,
  SupplierInvoiceErrorCode,
  SupplierInvoiceStatus,
} from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { MarkupEngineService } from '../../prices/services/markup-engine.service';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../stock/entities/stock.entity';
import { StockMovement } from '../../stock/entities/stock-movement.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { PriceReview } from '../entities/price-review.entity';
import { SupplierCostAdjustment } from '../entities/supplier-cost-adjustment.entity';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../entities/supplier-invoice-item.entity';
import { mapSupplierInvoiceDetail } from '../mappers/supplier-invoice.mapper';
import {
  allocateFifoLayerTranche,
  FifoLedgerError,
  reconstructFifoLayers,
} from '../utils/fifo-cost-layer-engine';
import {
  calculateSupplierCostAdjustment,
  calculateWeightedProductCost,
  SupplierCostAdjustmentMathError,
} from '../utils/supplier-cost-adjustment-math';

interface PreparedAdjustment {
  line: SupplierInvoiceItem;
  receiptItem: GoodsReceiptItem;
  product: Product;
  layerStartQtyBase: string;
  layerEndQtyBase: string;
  onHandAllocatedQty: string;
  consumedAllocatedQty: string;
  provisionalCostBaseUnitNet: string;
  realCostBaseUnitNet: string;
  costDifferenceUnitNet: string;
  stockRevaluation: string;
  cogsAdjustment: string;
}

@Injectable()
export class SupplierInvoiceConfirmationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly markupEngine: MarkupEngineService,
  ) {}

  async confirm(id: string, userId: string): Promise<ISupplierInvoiceDetail> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const invoice = await manager
          .createQueryBuilder(SupplierInvoice, 'invoice')
          .setLock('pessimistic_write')
          .where('invoice.id = :id', { id })
          .getOne();
        if (!invoice) {
          throw new NotFoundException({
            code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_NOT_FOUND,
            message: 'La factura de proveedor no existe.',
          });
        }
        if (invoice.status === SupplierInvoiceStatus.CONFIRMADA) {
          const existing = await this.loadDetail(manager, id);
          if (!existing.confirmation) {
            this.throwAdjustmentInconsistent(
              'La factura figura confirmada pero no conserva sus ajustes.',
            );
          }
          return existing;
        }
        if (invoice.status !== SupplierInvoiceStatus.AUTORIZADA) {
          throw new ConflictException({
            code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_STATUS,
            message: 'Solo una factura autorizada puede confirmarse.',
          });
        }

        const lines = await manager
          .createQueryBuilder(SupplierInvoiceItem, 'item')
          .setLock('pessimistic_write')
          .where('item.supplierInvoiceId = :id', { id })
          .orderBy('item.id', 'ASC')
          .getMany();
        if (!lines.length) {
          this.throwAdjustmentInconsistent(
            'La factura no contiene líneas conciliadas.',
          );
        }

        const productIds = [
          ...new Set(lines.map((line) => line.productId)),
        ].sort();
        const products = await manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id IN (:...productIds)', { productIds })
          .orderBy('product.id', 'ASC')
          .getMany();
        const stocks = await manager
          .createQueryBuilder(Stock, 'stock')
          .setLock('pessimistic_write')
          .where('stock.productId IN (:...productIds)', { productIds })
          .orderBy('stock.productId', 'ASC')
          .getMany();
        if (
          products.length !== productIds.length ||
          stocks.length !== productIds.length
        ) {
          this.throwAdjustmentInconsistent(
            'No se encontraron productos o saldos necesarios para confirmar.',
          );
        }
        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );
        const stockMap = new Map(
          stocks.map((stock) => [stock.productId, stock]),
        );

        const receiptItemIds = lines.map((line) => line.goodsReceiptItemId);
        const receiptItems = await manager.find(GoodsReceiptItem, {
          where: { id: In(receiptItemIds) },
        });
        const receiptItemMap = new Map(
          receiptItems.map((item) => [item.id, item]),
        );
        if (receiptItems.length !== receiptItemIds.length) {
          this.throwAdjustmentInconsistent(
            'No se encontraron todas las líneas de recepción conciliadas.',
          );
        }

        const previousAdjusted = await this.loadPreviouslyAdjustedQuantities(
          manager,
          receiptItemIds,
        );
        const fifoLayers = new Map<
          string,
          ReturnType<typeof reconstructFifoLayers>
        >();
        for (const productId of productIds) {
          const movements = await manager.find(StockMovement, {
            where: { productId },
            order: { createdAt: 'ASC', id: 'ASC' },
          });
          fifoLayers.set(
            productId,
            reconstructFifoLayers(
              movements,
              stockMap.get(productId)!.currentBaseStock,
            ),
          );
        }

        const prepared: PreparedAdjustment[] = lines.map((line) => {
          const receiptItem = receiptItemMap.get(line.goodsReceiptItemId)!;
          const product = productMap.get(line.productId)!;
          if (
            receiptItem.productId !== line.productId ||
            receiptItem.stockMovementId.length === 0
          ) {
            this.throwAdjustmentInconsistent(
              'La factura no coincide con la recepción registrada.',
            );
          }
          const layer = fifoLayers
            .get(line.productId)!
            .find(
              (candidate) =>
                candidate.movementId === receiptItem.stockMovementId,
            );
          if (
            !layer ||
            layer.movementType !== StockMovementType.ENTRADA_COMPRA ||
            !new Decimal(layer.originalQty).eq(receiptItem.receivedQtyBase)
          ) {
            this.throwLedgerInconsistent(
              'No se pudo identificar la capa de la recepción en el ledger.',
            );
          }
          const tranche = allocateFifoLayerTranche({
            layer,
            startQty: previousAdjusted.get(receiptItem.id) ?? '0',
            invoicedQty: line.allocatedReceivedQtyBase,
          });
          const amounts = calculateSupplierCostAdjustment({
            provisionalCostPurchaseUnitNet: line.provisionalCostUnitNet,
            realCostPurchaseUnitNet: line.realCostUnitNet,
            conversionFactor: line.conversionFactorSnapshot,
            onHandAllocatedQty: tranche.onHandAllocatedQty,
            consumedAllocatedQty: tranche.consumedAllocatedQty,
          });
          return { line, receiptItem, product, ...tranche, ...amounts };
        });

        const newCosts = new Map<string, string>();
        const previousProductCosts = new Map(
          products.map((product) => [
            product.id,
            new Decimal(product.costNet).toFixed(4),
          ]),
        );
        for (const productId of productIds) {
          const newCost = calculateWeightedProductCost(
            prepared
              .filter((item) => item.line.productId === productId)
              .map((item) => ({
                quantityBase: item.line.allocatedReceivedQtyBase,
                realCostBaseUnitNet: item.realCostBaseUnitNet,
              })),
          );
          if (newCost !== null) {
            if (new Decimal(newCost).gt('99999999.9999')) {
              this.throwAdjustmentInconsistent(
                'El costo definitivo supera la precisión admitida por producto.',
              );
            }
            newCosts.set(productId, newCost);
          }
        }

        const reviews: PriceReview[] = [];
        for (const productId of productIds) {
          const newCost = newCosts.get(productId);
          if (!newCost) continue;
          const product = productMap.get(productId)!;
          const previousCost = new Decimal(product.costNet).toFixed(4);
          const previousSuggested = new Decimal(
            product.suggestedPriceNet,
          ).toFixed(2);
          const activePrice = new Decimal(product.activePriceNet).toFixed(2);
          const effectiveMarkup = await this.markupEngine.resolveForProduct(
            product,
            manager,
          );
          const suggested = this.markupEngine.calculateSuggestedPrice(
            newCost,
            effectiveMarkup.percentage,
          );
          product.costNet = newCost;
          product.suggestedPriceNet = suggested;
          await manager.save(Product, product);
          reviews.push(
            await manager.save(
              PriceReview,
              manager.create(PriceReview, {
                supplierInvoiceId: invoice.id,
                productId,
                productCodeSnapshot: product.internalCode,
                productNameSnapshot: product.name,
                previousCostNet: previousCost,
                newCostNet: newCost,
                markupPercentageSnapshot: effectiveMarkup.percentage,
                effectiveMarkupLevel: effectiveMarkup.level,
                effectiveMarkupConfigurationId: effectiveMarkup.configurationId,
                effectiveMarkupTargetId: effectiveMarkup.targetId,
                effectiveMarkupTargetName: effectiveMarkup.targetName,
                previousSuggestedPriceNet: previousSuggested,
                suggestedPriceNet: suggested,
                activePriceNetSnapshot: activePrice,
                approvedPriceNet: null,
                status: PriceReviewStatus.PENDIENTE,
                reviewedByUserId: null,
                reviewedAt: null,
              }),
            ),
          );
        }

        const adjustments: SupplierCostAdjustment[] = [];
        for (const item of prepared) {
          const newProductCost =
            newCosts.get(item.line.productId) ??
            new Decimal(item.product.costNet).toFixed(4);
          adjustments.push(
            await manager.save(
              SupplierCostAdjustment,
              manager.create(SupplierCostAdjustment, {
                supplierInvoiceId: invoice.id,
                supplierInvoiceItemId: item.line.id,
                goodsReceiptId: invoice.goodsReceiptId,
                goodsReceiptItemId: item.receiptItem.id,
                productId: item.line.productId,
                stockMovementId: item.receiptItem.stockMovementId,
                productCodeSnapshot: item.line.productCodeSnapshot,
                productNameSnapshot: item.line.productNameSnapshot,
                provisionalCostPurchaseUnitNet: new Decimal(
                  item.line.provisionalCostUnitNet,
                ).toFixed(4),
                realCostPurchaseUnitNet: new Decimal(
                  item.line.realCostUnitNet,
                ).toFixed(4),
                conversionFactor: new Decimal(
                  item.line.conversionFactorSnapshot,
                ).toFixed(4),
                provisionalCostBaseUnitNet: item.provisionalCostBaseUnitNet,
                realCostBaseUnitNet: item.realCostBaseUnitNet,
                costDifferenceUnitNet: item.costDifferenceUnitNet,
                invoicedQtyBase: new Decimal(
                  item.line.allocatedReceivedQtyBase,
                ).toFixed(2),
                layerStartQtyBase: item.layerStartQtyBase,
                layerEndQtyBase: item.layerEndQtyBase,
                onHandAllocatedQty: item.onHandAllocatedQty,
                consumedAllocatedQty: item.consumedAllocatedQty,
                stockRevaluation: item.stockRevaluation,
                cogsAdjustment: item.cogsAdjustment,
                previousProductCostNet: previousProductCosts.get(
                  item.line.productId,
                )!,
                newProductCostNet: newProductCost,
                appliedByUserId: userId,
              }),
            ),
          );
        }

        const previousStatus = invoice.status;
        invoice.status = SupplierInvoiceStatus.CONFIRMADA;
        invoice.confirmedByUserId = userId;
        invoice.confirmedAt = new Date();
        await manager.save(SupplierInvoice, invoice);
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityName: 'SupplierInvoice',
          entityId: invoice.id,
          previousValues: { status: previousStatus },
          newValues: {
            status: invoice.status,
            confirmedAt: invoice.confirmedAt.toISOString(),
            adjustments: adjustments.map((adjustment) => ({
              id: adjustment.id,
              productId: adjustment.productId,
              invoicedQtyBase: adjustment.invoicedQtyBase,
              onHandAllocatedQty: adjustment.onHandAllocatedQty,
              consumedAllocatedQty: adjustment.consumedAllocatedQty,
              stockRevaluation: adjustment.stockRevaluation,
              cogsAdjustment: adjustment.cogsAdjustment,
            })),
            priceReviewIds: reviews.map((review) => review.id),
          },
        });
        return this.loadDetail(manager, invoice.id);
      });
    } catch (error: any) {
      if (error instanceof FifoLedgerError) {
        this.throwLedgerInconsistent(error.message);
      }
      if (error instanceof SupplierCostAdjustmentMathError) {
        this.throwAdjustmentInconsistent(error.message);
      }
      if (error?.code === '40P01' || error?.code === '40001') {
        throw new ConflictException({
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONFIRMATION_CONFLICT,
          message:
            'La factura, el producto o el stock fueron modificados simultáneamente.',
        });
      }
      if (error?.code === '23505') {
        throw new ConflictException({
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONFIRMATION_CONFLICT,
          message: 'La confirmación ya fue aplicada por otra operación.',
        });
      }
      throw error;
    }
  }

  private async loadPreviouslyAdjustedQuantities(
    manager: EntityManager,
    receiptItemIds: string[],
  ): Promise<Map<string, string>> {
    const rows = (await manager
      .createQueryBuilder(SupplierCostAdjustment, 'adjustment')
      .select('adjustment.goodsReceiptItemId', 'goodsReceiptItemId')
      .addSelect('COALESCE(SUM(adjustment.invoicedQtyBase), 0)', 'quantity')
      .where('adjustment.goodsReceiptItemId IN (:...receiptItemIds)', {
        receiptItemIds,
      })
      .groupBy('adjustment.goodsReceiptItemId')
      .getRawMany()) as Array<{ goodsReceiptItemId: string; quantity: string }>;
    return new Map(
      rows.map((row) => [
        row.goodsReceiptItemId,
        new Decimal(row.quantity).toFixed(2),
      ]),
    );
  }

  private async loadDetail(
    manager: EntityManager,
    id: string,
  ): Promise<ISupplierInvoiceDetail> {
    const invoice = await manager.findOneOrFail(SupplierInvoice, {
      where: { id },
      relations: {
        supplier: true,
        goodsReceipt: true,
        purchaseOrder: true,
        user: true,
        decisionUser: true,
        confirmedBy: true,
        items: true,
        costAdjustments: true,
        priceReviews: true,
      },
    });
    return mapSupplierInvoiceDetail(invoice);
  }

  private throwLedgerInconsistent(message: string): never {
    throw new ConflictException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_LEDGER_INCONSISTENT,
      message,
    });
  }

  private throwAdjustmentInconsistent(message: string): never {
    throw new ConflictException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ADJUSTMENT_INCONSISTENT,
      message,
    });
  }
}

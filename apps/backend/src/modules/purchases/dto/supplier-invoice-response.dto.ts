import { ApiProperty } from '@nestjs/swagger';
import {
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceObservationReason,
  PriceReviewStatus,
} from '@erp/shared-types';

export class SupplierCostAdjustmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) supplierInvoiceId: string;
  @ApiProperty({ format: 'uuid' }) supplierInvoiceItemId: string;
  @ApiProperty({ format: 'uuid' }) goodsReceiptId: string;
  @ApiProperty({ format: 'uuid' }) goodsReceiptItemId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty({ format: 'uuid' }) stockMovementId: string;
  @ApiProperty({ example: '10.0000' }) provisionalCostPurchaseUnitNet: string;
  @ApiProperty({ example: '11.0000' }) realCostPurchaseUnitNet: string;
  @ApiProperty({ example: '1.0000' }) conversionFactor: string;
  @ApiProperty({ example: '10.0000' }) provisionalCostBaseUnitNet: string;
  @ApiProperty({ example: '11.0000' }) realCostBaseUnitNet: string;
  @ApiProperty({ example: '1.0000' }) costDifferenceUnitNet: string;
  @ApiProperty({ example: '100.00' }) invoicedQtyBase: string;
  @ApiProperty({ example: '0.00' }) layerStartQtyBase: string;
  @ApiProperty({ example: '100.00' }) layerEndQtyBase: string;
  @ApiProperty({ example: '70.00' }) onHandAllocatedQty: string;
  @ApiProperty({ example: '30.00' }) consumedAllocatedQty: string;
  @ApiProperty({ example: '70.0000' }) stockRevaluation: string;
  @ApiProperty({ example: '30.0000' }) cogsAdjustment: string;
  @ApiProperty({ example: '10.0000' }) previousProductCostNet: string;
  @ApiProperty({ example: '11.0000' }) newProductCostNet: string;
  @ApiProperty({ format: 'date-time' }) appliedAt: string;
}

export class PriceReviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) supplierInvoiceId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty() previousCostNet: string;
  @ApiProperty() newCostNet: string;
  @ApiProperty({ nullable: true }) markupPercentageSnapshot: string | null;
  @ApiProperty() previousSuggestedPriceNet: string;
  @ApiProperty() suggestedPriceNet: string;
  @ApiProperty() activePriceNetSnapshot: string;
  @ApiProperty({ nullable: true }) approvedPriceNet: string | null;
  @ApiProperty({ enum: PriceReviewStatus }) status: PriceReviewStatus;
  @ApiProperty({ format: 'uuid', nullable: true }) reviewedByUserId:
    string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) reviewedAt:
    string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class SupplierInvoiceConfirmationResponseDto {
  @ApiProperty({ format: 'date-time' }) confirmedAt: string;
  @ApiProperty({ type: 'object' }) confirmedBy: {
    id: string;
    name: string;
    email: string;
  };
  @ApiProperty({ example: '70.0000' }) stockRevaluationTotal: string;
  @ApiProperty({ example: '30.0000' }) cogsAdjustmentTotal: string;
  @ApiProperty({ type: [SupplierCostAdjustmentResponseDto] })
  adjustments: SupplierCostAdjustmentResponseDto[];
  @ApiProperty({ type: [PriceReviewResponseDto] })
  priceReviews: PriceReviewResponseDto[];
}

export class SupplierInvoiceItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() itemIndex: number;
  @ApiProperty({ format: 'uuid' }) goodsReceiptItemId: string;
  @ApiProperty({ format: 'uuid' }) purchaseOrderItemId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty({ format: 'uuid' }) purchaseUnitId: string;
  @ApiProperty() purchaseUnitName: string;
  @ApiProperty() purchaseUnitSymbol: string;
  @ApiProperty({ example: '10.0000' }) conversionFactor: string;
  @ApiProperty({ example: '5.0000' }) receivedQtyPurchaseUnit: string;
  @ApiProperty({ example: '0.0000' })
  previouslyAllocatedQtyPurchaseUnit: string;
  @ApiProperty({ example: '5.0000' }) availableQtyBefore: string;
  @ApiProperty({ example: '5.0000' }) invoicedQtyPurchaseUnit: string;
  @ApiProperty({ example: '5.0000' }) allocatedReceivedQtyPurchaseUnit: string;
  @ApiProperty({ example: '50.00' }) allocatedReceivedQtyBase: string;
  @ApiProperty({ example: '0.0000' }) pendingQtyAfter: string;
  @ApiProperty({ example: '0.0000' }) quantityExcess: string;
  @ApiProperty({ enum: SupplierInvoiceQuantityStatus })
  quantityStatus: SupplierInvoiceQuantityStatus;
  @ApiProperty({ example: '100.0000' }) provisionalCostUnitNet: string;
  @ApiProperty({ example: '110.0000' }) unitPriceNet: string;
  @ApiProperty({ example: '0.0000' }) discountNet: string;
  @ApiProperty({ example: '0.0000' }) bonusNet: string;
  @ApiProperty({ example: '0.0000' }) surchargeNet: string;
  @ApiProperty({ example: '110.0000' }) realCostUnitNet: string;
  @ApiProperty({ example: '550.0000' }) lineNetTotal: string;
  @ApiProperty({ enum: SupplierInvoiceAdjustmentMode })
  discountMode: SupplierInvoiceAdjustmentMode;
  @ApiProperty({ nullable: true }) discountPercentage: string | null;
  @ApiProperty({ enum: SupplierInvoiceAdjustmentMode })
  bonusMode: SupplierInvoiceAdjustmentMode;
  @ApiProperty({ nullable: true }) bonusPercentage: string | null;
  @ApiProperty({ enum: SupplierInvoiceAdjustmentMode })
  surchargeMode: SupplierInvoiceAdjustmentMode;
  @ApiProperty({ nullable: true }) surchargePercentage: string | null;
  @ApiProperty() costDifferenceUnitNet: string;
  @ApiProperty({ nullable: true }) costVariationPercentage: string | null;
  @ApiProperty({ enum: SupplierInvoiceCostStatus })
  costStatus: SupplierInvoiceCostStatus;
  @ApiProperty({ enum: SupplierInvoiceObservationReason, isArray: true })
  observationReasons: SupplierInvoiceObservationReason[];
}

export class SupplierInvoiceResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() invoiceNumber: string;
  @ApiProperty({ type: 'object' }) supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  @ApiProperty({ type: 'object' }) goodsReceipt: {
    id: string;
    receiptNumber: string;
    deliveryNoteNumber: string;
    createdAt: string;
  };
  @ApiProperty({ type: 'object' }) purchaseOrder: {
    id: string;
    orderNumber: string;
  };
  @ApiProperty({ format: 'date' }) invoiceDate: string;
  @ApiProperty({ enum: SupplierInvoiceStatus }) status: SupplierInvoiceStatus;
  @ApiProperty() netTotal: string;
  @ApiProperty() taxTotal: string;
  @ApiProperty({ enum: SupplierInvoiceAdjustmentMode })
  taxMode: SupplierInvoiceAdjustmentMode;
  @ApiProperty({ nullable: true }) taxPercentage: string | null;
  @ApiProperty() costTolerancePercentageSnapshot: string;
  @ApiProperty() totalAmount: string;
  @ApiProperty() itemCount: number;
  @ApiProperty() observedLineCount: number;
  @ApiProperty({ type: 'object' }) user: {
    id: string;
    name: string;
    email: string;
  };
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ type: [SupplierInvoiceItemResponseDto] })
  items: SupplierInvoiceItemResponseDto[];
  @ApiProperty({ type: 'object', nullable: true }) decision: object | null;
  @ApiProperty({ type: SupplierInvoiceConfirmationResponseDto, nullable: true })
  confirmation: SupplierInvoiceConfirmationResponseDto | null;
}

export class PaginatedSupplierInvoicesResponseDto {
  @ApiProperty({ type: [SupplierInvoiceResponseDto] })
  data: SupplierInvoiceResponseDto[];
  @ApiProperty({ type: 'object' }) meta: Record<string, number | boolean>;
}

export class PaginatedPendingInvoiceReceiptsResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } }) data: unknown[];
  @ApiProperty({ type: 'object' }) meta: Record<string, number | boolean>;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
} from '@erp/shared-types';

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PurchaseOrderStatus,
  type IBackorderItem,
  type IBackorderOrder,
  type IBackordersResponse,
  type IBackorderSupplierGroup,
} from '@erp/shared-types';

export class BackorderItemResponseDto implements IBackorderItem {
  @ApiProperty() purchaseOrderItemId: string;
  @ApiProperty() productId: string;
  @ApiProperty({ example: 'P0001' }) productCode: string;
  @ApiProperty({ example: 'Gasa estéril 10 x 10 cm' }) productName: string;
  @ApiProperty({ example: 'PROV-001' }) supplierSku: string;
  @ApiProperty({ example: 'Caja' }) purchaseUnitName: string;
  @ApiProperty({ example: 'cja' }) purchaseUnitSymbol: string;
  @ApiProperty({ example: '10.0000' }) orderedQty: string;
  @ApiProperty({ example: '4.0000' }) receivedQty: string;
  @ApiProperty({ example: '6.0000' }) pendingQty: string;
}

export class BackorderOrderResponseDto implements IBackorderOrder {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'OC-000123' }) orderNumber: string;
  @ApiProperty({
    enum: [PurchaseOrderStatus.EMITIDA, PurchaseOrderStatus.PARCIAL],
  })
  status: PurchaseOrderStatus.EMITIDA | PurchaseOrderStatus.PARCIAL;
  @ApiProperty({ example: '2026-08-01T13:00:00.000Z' }) emittedAt: string;
  @ApiPropertyOptional({ example: '2026-08-10', nullable: true })
  expectedDeliveryDate: string | null;
  @ApiProperty({ example: 15 }) ageDays: number;
  @ApiProperty({ example: true }) isUrgent: boolean;
  @ApiProperty({ example: 2 }) pendingLineCount: number;
  @ApiProperty({ type: [BackorderItemResponseDto] })
  items: BackorderItemResponseDto[];
}

export class BackorderSupplierSummaryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Droguería Médica S.A.' }) businessName: string;
  @ApiProperty({ example: '30712345678' }) cuit: string;
}

export class BackorderSupplierGroupResponseDto implements IBackorderSupplierGroup {
  @ApiProperty({ type: BackorderSupplierSummaryResponseDto })
  supplier: BackorderSupplierSummaryResponseDto;
  @ApiProperty({ example: 3 }) orderCount: number;
  @ApiProperty({ example: 5 }) pendingProductCount: number;
  @ApiProperty({ example: 6 }) pendingLineCount: number;
  @ApiProperty({ example: 1 }) urgentOrderCount: number;
  @ApiProperty({ type: [BackorderOrderResponseDto] })
  orders: BackorderOrderResponseDto[];
}

export class BackordersSummaryResponseDto {
  @ApiProperty({ example: 2 }) supplierCount: number;
  @ApiProperty({ example: 4 }) orderCount: number;
  @ApiProperty({ example: 7 }) pendingProductCount: number;
  @ApiProperty({ example: 8 }) pendingLineCount: number;
  @ApiProperty({ example: 2 }) urgentOrderCount: number;
}

export class BackordersResponseDto implements IBackordersResponse {
  @ApiProperty({ example: '2026-08-27T13:00:00.000Z' }) generatedAt: string;
  @ApiProperty({ type: BackordersSummaryResponseDto })
  summary: BackordersSummaryResponseDto;
  @ApiProperty({ type: [BackorderSupplierGroupResponseDto] })
  groups: BackorderSupplierGroupResponseDto[];
}

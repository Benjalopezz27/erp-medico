import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PurchaseOrderStatus,
  IPurchaseOrderItemDetail,
  IPurchaseOrderSummary,
  IPurchaseOrderDetail,
} from '@erp/shared-types';

export class PurchaseOrderSupplierSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Droguería Médica S.A.' })
  businessName: string;

  @ApiProperty({ example: '30712345678' })
  cuit: string;
}

export class PurchaseOrderUserSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;

  @ApiProperty({ example: 'admin@erp.com' })
  email: string;
}

export class PurchaseOrderItemDetailResponseDto implements IPurchaseOrderItemDetail {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 1 })
  itemIndex: number;

  @ApiProperty()
  supplierProductId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  purchaseUnitId: string;

  @ApiProperty({ example: 'MED-001' })
  supplierSku: string;

  @ApiProperty({ example: 'P0001' })
  productCode: string;

  @ApiProperty({ example: 'Gasa estéril 10 x 10 cm' })
  productName: string;

  @ApiProperty({ example: 'Paquete' })
  purchaseUnitName: string;

  @ApiProperty({ example: 'paq' })
  purchaseUnitSymbol: string;

  @ApiProperty({ example: '10.0000' })
  conversionFactor: string;

  @ApiProperty({ example: '24.0000' })
  orderedQty: string;

  @ApiProperty({ example: '0.0000' })
  receivedQty: string;

  @ApiProperty({ example: '24.0000' })
  pendingQty: string;

  @ApiProperty({ example: '1250.5000' })
  expectedCostUnitNet: string;

  @ApiProperty({ example: '30012.0000' })
  subtotalNet: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PurchaseOrderSummaryResponseDto implements IPurchaseOrderSummary {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'OC-000001' })
  orderNumber: string;

  @ApiProperty({ type: PurchaseOrderSupplierSummaryDto })
  supplier: PurchaseOrderSupplierSummaryDto;

  @ApiProperty({
    enum: PurchaseOrderStatus,
    example: PurchaseOrderStatus.BORRADOR,
  })
  status: PurchaseOrderStatus;

  @ApiPropertyOptional({ example: '2026-09-01' })
  expectedDeliveryDate: string | null;

  @ApiPropertyOptional({ example: 'Observaciones de entrega' })
  notes: string | null;

  @ApiProperty({ example: '30012.0000' })
  totalNet: string;

  @ApiProperty({ example: 3 })
  itemsCount: number;

  @ApiProperty({ type: PurchaseOrderUserSummaryDto })
  user: PurchaseOrderUserSummaryDto;

  @ApiPropertyOptional({ example: '2026-08-26T15:30:00.000Z' })
  emittedAt: string | null;

  @ApiPropertyOptional({ example: null })
  cancelledAt: string | null;

  @ApiPropertyOptional({ example: null })
  cancelReason: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PurchaseOrderDetailResponseDto
  extends PurchaseOrderSummaryResponseDto
  implements IPurchaseOrderDetail
{
  @ApiProperty({ type: [PurchaseOrderItemDetailResponseDto] })
  items: PurchaseOrderItemDetailResponseDto[];
}

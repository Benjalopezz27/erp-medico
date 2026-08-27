import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@erp/shared-types';
import { GoodsReceiptResponseDto } from './goods-receipt-response.dto';

export class ResultingPurchaseOrderItemDto {
  @ApiProperty({
    description: 'ID de la línea de la orden de compra',
    example: '33333333-3333-4333-a333-333333333333',
  })
  purchaseOrderItemId: string;

  @ApiProperty({
    description: 'Cantidad ordenada total en la unidad de compra',
    example: '20.0000',
  })
  orderedQty: string;

  @ApiProperty({
    description: 'Cantidad acumulada recibida en la unidad de compra',
    example: '10.0000',
  })
  receivedQty: string;

  @ApiProperty({
    description: 'Cantidad remanente pendiente en la unidad de compra',
    example: '10.0000',
  })
  pendingQty: string;
}

export class ResultingPurchaseOrderDto {
  @ApiProperty({
    description: 'ID de la orden de compra',
    example: '11111111-1111-4111-a111-111111111111',
  })
  id: string;

  @ApiProperty({
    description:
      'Nuevo estado de la orden de compra resultante de la recepción',
    enum: PurchaseOrderStatus,
    example: PurchaseOrderStatus.PARCIAL,
  })
  status: PurchaseOrderStatus;

  @ApiProperty({
    description: 'Líneas de la orden de compra con sus saldos actualizados',
    type: [ResultingPurchaseOrderItemDto],
  })
  items: ResultingPurchaseOrderItemDto[];
}

export class CreateGoodsReceiptResponseDto {
  @ApiProperty({
    description: 'Datos inmutables históricos de la recepción registrada',
    type: GoodsReceiptResponseDto,
  })
  receipt: GoodsReceiptResponseDto;

  @ApiProperty({
    description: 'Estado actual resultante de la orden de compra',
    type: ResultingPurchaseOrderDto,
  })
  resultingPurchaseOrder: ResultingPurchaseOrderDto;
}

import { ApiProperty } from '@nestjs/swagger';

export class GoodsReceiptItemResponseDto {
  @ApiProperty({
    description: 'ID de la línea de recepción',
    example: '99999999-9999-4999-a999-999999999999',
  })
  id: string;

  @ApiProperty({
    description: 'ID de la línea de orden de compra asociada',
    example: '33333333-3333-4333-a333-333333333333',
  })
  purchaseOrderItemId: string;

  @ApiProperty({
    description: 'ID del producto recibido',
    example: '44444444-4444-4444-a444-444444444444',
  })
  productId: string;

  @ApiProperty({
    description: 'Código interno del producto (snapshot)',
    example: 'MED-001',
  })
  productCode: string;

  @ApiProperty({
    description: 'Nombre del producto (snapshot)',
    example: 'Jeringa Descartable 5ml',
  })
  productName: string;

  @ApiProperty({
    description: 'ID de la unidad de compra utilizada',
    example: '55555555-5555-4555-a555-555555555555',
  })
  purchaseUnitId: string;

  @ApiProperty({
    description: 'Nombre de la unidad de compra (snapshot)',
    example: 'Caja x 100',
  })
  purchaseUnitName: string;

  @ApiProperty({
    description: 'Símbolo de la unidad de compra (snapshot)',
    example: 'CJA',
  })
  purchaseUnitSymbol: string;

  @ApiProperty({
    description: 'Cantidad recibida en la unidad de compra',
    example: '10.0000',
  })
  receivedQtyPurchaseUnit: string;

  @ApiProperty({
    description: 'Factor de conversión a unidad base utilizado (snapshot)',
    example: '100.0000',
  })
  conversionFactorUsed: string;

  @ApiProperty({
    description: 'Cantidad convertida e ingresada al stock base (escala 2)',
    example: '1000.00',
  })
  receivedQtyBase: string;

  @ApiProperty({
    description: 'Costo neto provisional unitario aplicado (escala 4)',
    example: '1500.5000',
  })
  provisionalCostUnitNet: string;

  @ApiProperty({
    description: 'Subtotal neto provisional de la línea recibida (escala 4)',
    example: '15005.0000',
  })
  provisionalSubtotalNet: string;

  @ApiProperty({
    description: 'ID del movimiento inmutable de stock generado',
    example: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  })
  stockMovementId: string;

  @ApiProperty({
    description: 'Saldo previo de stock base antes del movimiento',
    example: '50.00',
  })
  previousStock: string;

  @ApiProperty({
    description: 'Saldo posterior de stock base después del movimiento',
    example: '1050.00',
  })
  subsequentStock: string;
}

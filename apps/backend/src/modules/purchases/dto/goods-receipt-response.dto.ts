import { ApiProperty } from '@nestjs/swagger';
import { GoodsReceiptItemResponseDto } from './goods-receipt-item-response.dto';

export class GoodsReceiptResponseDto {
  @ApiProperty({
    description: 'ID de la recepción de mercadería',
    example: '77777777-7777-4777-a777-777777777777',
  })
  id: string;

  @ApiProperty({
    description: 'Número de recepción interno correlativo',
    example: 'REC-000001',
  })
  receiptNumber: string;

  @ApiProperty({
    description: 'ID de la orden de compra asociada',
    example: '11111111-1111-4111-a111-111111111111',
  })
  purchaseOrderId: string;

  @ApiProperty({
    description: 'Número de la orden de compra',
    example: 'OC-000001',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Proveedor asociado a la orden de compra',
    example: {
      id: '22222222-2222-4222-a222-222222222222',
      businessName: 'Droguería Central S.A.',
      cuit: '30-12345678-9',
    },
  })
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };

  @ApiProperty({
    description: 'Número de remito original del proveedor',
    example: '0001-00001234',
  })
  deliveryNoteNumber: string;

  @ApiProperty({
    description: 'Usuario que registró la recepción',
    example: {
      id: '88888888-8888-4888-a888-888888888888',
      name: 'Admin Usuario',
      email: 'admin@erp.com',
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Fecha y hora de creación de la recepción',
    example: '2026-08-27T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Líneas recibidas en este remito',
    type: [GoodsReceiptItemResponseDto],
  })
  items: GoodsReceiptItemResponseDto[];
}

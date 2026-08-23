import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType, type IStockMovement } from '@erp/shared-types';

export class StockMovementResponseDto implements IStockMovement {
  @ApiProperty({
    description: 'Movement UUID',
    example: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  id: string;

  @ApiProperty({
    description: 'Product UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  productId: string;

  @ApiProperty({
    enum: StockMovementType,
    example: StockMovementType.ENTRADA_COMPRA,
  })
  movementType: StockMovementType;

  @ApiProperty({
    description: 'Quantity moved in base units',
    example: 50.0,
  })
  quantityBase: number;

  @ApiProperty({
    description: 'Stock balance prior to this movement',
    example: 100.0,
  })
  previousStock: number;

  @ApiProperty({
    description: 'Resultant stock balance after this movement',
    example: 150.0,
  })
  subsequentStock: number;

  @ApiProperty({
    description: 'Reason for movement',
    example: 'Recepción de compra OC-1004',
  })
  reason: string;

  @ApiPropertyOptional({
    description: 'External document reference',
    example: 'FAC-A-0001-00001234',
    nullable: true,
  })
  documentReference?: string | null;

  @ApiProperty({
    description: 'Actor User UUID',
    example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  userId: string;

  @ApiProperty({
    description: 'Movement registration timestamp',
    example: '2026-08-23T19:00:00.000Z',
  })
  createdAt: Date;
}

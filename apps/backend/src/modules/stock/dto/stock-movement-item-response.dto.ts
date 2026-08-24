import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@erp/shared-types';

export class StockMovementUserResponseDto {
  @ApiProperty({
    description: 'Auditing user UUID v4',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Auditing user full name',
    example: 'Admin Sistema',
  })
  name: string;
}

export class StockMovementItemResponseDto {
  @ApiProperty({
    description: 'Movement entry UUID v4',
    example: '423e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Type of inventory movement',
    enum: StockMovementType,
    example: StockMovementType.ENTRADA_COMPRA,
  })
  movementType: StockMovementType;

  @ApiProperty({
    description: 'Absolute quantity moved in base units',
    example: 50.0,
  })
  quantityBase: number;

  @ApiProperty({
    description: 'Stock balance immediately before this movement',
    example: 10.0,
  })
  previousStock: number;

  @ApiProperty({
    description: 'Stock balance resulting immediately after this movement',
    example: 60.0,
  })
  subsequentStock: number;

  @ApiProperty({
    description: 'Mandatory operational explanation or reason',
    example: 'Recepción orden de compra OC-1020',
  })
  reason: string;

  @ApiProperty({
    description:
      'Optional external document reference (e.g. invoice or receipt code)',
    example: 'REM-0001-00000045',
    nullable: true,
  })
  documentReference: string | null;

  @ApiProperty({
    description: 'User actor responsible for recording the movement',
    type: () => StockMovementUserResponseDto,
  })
  user: StockMovementUserResponseDto;

  @ApiProperty({
    description: 'Creation timestamp in ISO-8601 UTC',
    example: '2026-08-24T14:30:00.000Z',
  })
  createdAt: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import type { IStock } from '@erp/shared-types';

export class StockResponseDto implements IStock {
  @ApiProperty({
    description: 'Stock record UUID',
    example: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  id: string;

  @ApiProperty({
    description: 'Associated product UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  productId: string;

  @ApiProperty({
    description: 'Current consolidated balance in base units',
    example: 150.0,
  })
  currentBaseStock: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-08-23T19:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-08-23T19:00:00.000Z',
  })
  updatedAt: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@erp/shared-types';

export class StockEvolutionPointDto {
  @ApiProperty({
    description: 'ISO-8601 timestamp of the point',
    example: '2026-08-14T17:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Stock balance at this timestamp in base units',
    example: 45.0,
  })
  balance: number;

  @ApiProperty({
    description: 'Event trigger or movement type',
    example: 'SALIDA_VENTA',
  })
  event: StockMovementType | 'BASELINE';

  @ApiProperty({
    description: 'Quantity delta of the movement (0 for baseline)',
    example: 10.0,
  })
  quantity: number;
}

export class StockEvolutionResponseDto {
  @ApiProperty({
    description: 'Product UUID v4',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Configured minimum stock threshold in base units',
    example: 100.0,
  })
  minStock: number;

  @ApiProperty({
    description: 'Indicates whether the data series was truncated to limit',
    example: false,
  })
  truncated: boolean;

  @ApiProperty({
    description: 'Effective starting ISO-8601 timestamp of data window',
    example: '2026-08-01T00:00:00.000Z',
    nullable: true,
  })
  effectiveFrom: string | null;

  @ApiProperty({
    description: 'Effective ending ISO-8601 timestamp of data window',
    example: '2026-08-31T23:59:59.999Z',
    nullable: true,
  })
  effectiveTo: string | null;

  @ApiProperty({
    description:
      'Chronologically ascending series of data points for Recharts graph',
    type: () => [StockEvolutionPointDto],
  })
  points: StockEvolutionPointDto[];
}

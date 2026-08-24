import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Min,
} from 'class-validator';
import { StockMovementType } from '@erp/shared-types';

export class QueryStockMovementsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    enum: [10, 25, 50],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 25, 50])
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter ledger by movement type',
    enum: StockMovementType,
    example: StockMovementType.ENTRADA_COMPRA,
  })
  @IsOptional()
  @IsEnum(StockMovementType)
  movementType?: StockMovementType;

  @ApiPropertyOptional({
    description: 'Filter movements from inclusive ISO-8601 UTC timestamp',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter movements to inclusive ISO-8601 UTC timestamp',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StockStatus } from '@erp/shared-types';

export class QueryStockDto {
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
    description:
      'Case-insensitive search term matching internal code or product name',
    example: 'Paracetamol',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter products by category UUID v4',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter products by stock health status',
    enum: StockStatus,
    example: StockStatus.LOW,
  })
  @IsOptional()
  @IsEnum(StockStatus)
  stockStatus?: StockStatus;
}

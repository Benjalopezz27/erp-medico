import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@erp/shared-types';

export class QueryProductsDto {
  @ApiPropertyOptional({
    description: 'Filter by product status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus, {
    message: 'El estado debe ser ACTIVE o INACTIVE.',
  })
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Pagination offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero.' })
  @Min(0, { message: 'El offset no puede ser negativo.' })
  offset?: number;

  @ApiPropertyOptional({
    description: 'Pagination limit (number of items per page)',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El limit debe ser un número entero.' })
  @Min(1, { message: 'El limit debe ser al menos 1.' })
  @Max(100, { message: 'El limit no puede exceder 100.' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Optional page helper (1-indexed, maps to offset)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser al menos 1.' })
  page?: number;
}

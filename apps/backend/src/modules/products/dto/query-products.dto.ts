import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductStatus } from '@erp/shared-types';

export class QueryProductsDto {
  @ApiPropertyOptional({
    description: 'Filter by text matching internalCode or name',
    example: 'Ibuprofeno',
  })
  @IsOptional()
  @IsString({ message: 'El parámetro search debe ser texto.' })
  @MaxLength(100, {
    message: 'El parámetro search no puede exceder 100 caracteres.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La categoría debe ser un UUID válido.' })
  category?: string;

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

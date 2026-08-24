import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { IStockAlertsSearchParams } from '@erp/shared-types';

export class QueryStockAlertsDto implements IStockAlertsSearchParams {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de página debe ser un número entero.' })
  @Min(1, { message: 'El número de página debe ser mayor o igual a 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser mayor o igual a 1.' })
  @Max(50, { message: 'El límite no puede ser mayor a 50.' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by internalCode or productName',
    example: 'Amox',
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de categoría debe ser un UUID válido.' })
  categoryId?: string;
}

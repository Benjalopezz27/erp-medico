import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierSortField } from '@erp/shared-types';

export class QuerySupplierDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página (base 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Cantidad de elementos por página (1 a 100)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Droguería',
    description: 'Término de búsqueda por razón social o CUIT',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo o inactivo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['businessName', 'cuit', 'taxCondition', 'createdAt', 'updatedAt'],
    description: 'Campo por el cual ordenar',
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['businessName', 'cuit', 'taxCondition', 'createdAt', 'updatedAt'])
  sortBy?: SupplierSortField = 'createdAt';

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC', 'asc', 'desc'],
    description: 'Dirección del ordenamiento',
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}

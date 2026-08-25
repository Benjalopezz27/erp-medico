import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierProductSortField } from '@erp/shared-types';

export class QuerySupplierProductDto {
  @ApiPropertyOptional({
    description: 'Número de página (inicia en 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(100, { message: 'El límite máximo es 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Término de búsqueda por SKU de proveedor, descripción externa, código interno o nombre del producto',
    example: 'MED-PROV-99',
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser un texto' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar los resultados',
    example: 'createdAt',
    enum: [
      'supplierExternalCode',
      'productInternalCode',
      'productName',
      'isPrimarySupplier',
      'createdAt',
      'updatedAt',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(
    [
      'supplierExternalCode',
      'productInternalCode',
      'productName',
      'isPrimarySupplier',
      'createdAt',
      'updatedAt',
    ],
    { message: 'El campo de ordenamiento no es válido' },
  )
  sortBy?: SupplierProductSortField = 'createdAt';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'], {
    message: 'La dirección de ordenamiento debe ser ASC o DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

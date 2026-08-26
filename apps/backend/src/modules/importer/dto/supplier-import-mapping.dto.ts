import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ISupplierImportMapping } from '@erp/shared-types';

export class SupplierImportMappingDto implements ISupplierImportMapping {
  @ApiProperty({
    example: 'cod_articulo',
    description: 'Nombre de la columna del archivo mapeada al SKU de proveedor',
  })
  @IsString({ message: 'El campo supplierSku debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El mapeo de SKU de proveedor es obligatorio.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  supplierSku: string;

  @ApiProperty({
    example: 'precio_unitario',
    description: 'Nombre de la columna del archivo mapeada al costo neto',
  })
  @IsString({ message: 'El campo usualCostNet debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El mapeo de costo neto es obligatorio.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  usualCostNet: string;

  @ApiPropertyOptional({
    example: 'descripcion_prod',
    description: 'Nombre de la columna del archivo mapeada a la descripción',
    nullable: true,
  })
  @IsOptional()
  @IsString({
    message: 'El campo supplierDescription debe ser una cadena de texto.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null,
  )
  supplierDescription?: string | null;

  @ApiPropertyOptional({
    example: 'cantidad_bulto',
    description: 'Nombre de la columna del archivo con cantidad informativa',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'El campo rawQuantity debe ser una cadena de texto.' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null,
  )
  rawQuantity?: string | null;

  @ApiPropertyOptional({
    example: 'unidad_medida',
    description: 'Nombre de la columna del archivo con presentación o unidad',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'El campo purchaseUnit debe ser una cadena de texto.' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null,
  )
  purchaseUnit?: string | null;
}

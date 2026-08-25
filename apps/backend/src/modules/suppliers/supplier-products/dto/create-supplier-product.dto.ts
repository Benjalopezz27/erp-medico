import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateSupplierProductDto {
  @ApiProperty({
    description: 'UUID del producto interno asociado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'El productId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El productId es obligatorio' })
  productId: string;

  @ApiProperty({
    description: 'Código o SKU externo utilizado por el proveedor',
    example: 'MED-PROV-99',
    maxLength: 100,
  })
  @IsString({ message: 'El código externo debe ser un texto' })
  @IsNotEmpty({ message: 'El código externo es obligatorio' })
  @MaxLength(100, {
    message: 'El código externo no puede exceder 100 caracteres',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  supplierExternalCode: string;

  @ApiPropertyOptional({
    description: 'Descripción externa del producto según el proveedor',
    example: 'Solución Fisiológica 500ml x 10',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(255, {
    message: 'La descripción no puede exceder 255 caracteres',
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? null
        : value.trim()
      : value,
  )
  supplierDescription?: string | null;

  @ApiProperty({
    description: 'UUID de la unidad de compra utilizada por el proveedor',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: 'El purchaseUnitId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El purchaseUnitId es obligatorio' })
  purchaseUnitId: string;

  @ApiProperty({
    description:
      'Factor de conversión para transformar 1 unidad de compra a unidades base del producto',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4, allowNaN: false, allowInfinity: false },
    {
      message:
        'El factor de conversión debe ser un número válido con hasta 4 decimales',
    },
  )
  @IsPositive({
    message: 'El factor de conversión debe ser estrictamente mayor a 0',
  })
  conversionFactorToBase: number;

  @ApiPropertyOptional({
    description: 'Costo neto habitual acordado con el proveedor',
    example: 1500.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4, allowNaN: false, allowInfinity: false },
    {
      message:
        'El costo neto habitual debe ser un número válido con hasta 4 decimales',
    },
  )
  @Min(0, { message: 'El costo neto habitual no puede ser negativo' })
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  usualCostNet?: number | null;

  @ApiPropertyOptional({
    description: 'Indica si este proveedor es el habitual para el producto',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrimarySupplier debe ser un booleano' })
  isPrimarySupplier?: boolean;
}

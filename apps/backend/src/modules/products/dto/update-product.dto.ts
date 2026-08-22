import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductStatus } from '@erp/shared-types';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Commercial name of the product',
    example: 'Ibuprofeno 400mg x 10 comprimidos (Modificado)',
    maxLength: 150,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre del producto debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del producto no puede estar vacío.' })
  @MaxLength(150, {
    message: 'El nombre del producto no puede exceder los 150 caracteres.',
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Detailed description. Send null or empty string to clear the description.',
    example: 'Nueva indicación clínica actualizada',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : null,
  )
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(500, {
    message: 'La descripción no puede exceder los 500 caracteres.',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the category',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4', { message: 'El categoryId debe ser un UUID válido.' })
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'UUID of the base unit of measure (cannot be modified if conversions exist)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4', { message: 'El baseUnitId debe ser un UUID válido.' })
  baseUnitId?: string;

  @ApiPropertyOptional({
    description: 'Minimum stock alert threshold',
    example: 120,
    minimum: 0,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El stock mínimo debe ser un número con hasta 2 decimales.' },
  )
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  @Max(9999999999.99, {
    message: 'El stock mínimo no puede exceder 9999999999.99.',
  })
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Net purchase cost from supplier in ARS',
    example: 1600.0,
    minimum: 0,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El costo neto debe ser un número con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El costo neto no puede ser negativo.' })
  @Max(99999999.9999, {
    message: 'El costo neto no puede exceder 99999999.9999.',
  })
  costNet?: number;

  @ApiPropertyOptional({
    description: 'Target markup percentage',
    example: 40.0,
    minimum: 0,
    maximum: 1000,
    nullable: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message:
        'El porcentaje de markup debe ser un número con hasta 4 decimales.',
    },
  )
  @Min(0, { message: 'El porcentaje de markup no puede ser negativo.' })
  @Max(1000, {
    message: 'El porcentaje de markup no puede exceder el 1000%.',
  })
  markupPercentage?: number | null;

  @ApiPropertyOptional({
    description: 'Current active net selling price in ARS',
    example: 2240.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio activo debe ser un número con hasta 2 decimales.' },
  )
  @Min(0, { message: 'El precio activo no puede ser negativo.' })
  @Max(9999999999.99, {
    message: 'El precio activo no puede exceder 9999999999.99.',
  })
  activePriceNet?: number;

  @ApiPropertyOptional({
    description: 'Catalog state of the product (ACTIVE or INACTIVE)',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ProductStatus, {
    message: 'El estado debe ser ACTIVE o INACTIVE.',
  })
  status?: ProductStatus;
}

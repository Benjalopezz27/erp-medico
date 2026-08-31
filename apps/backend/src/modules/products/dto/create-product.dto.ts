import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductTaxTreatment } from '@erp/shared-types';
import { CreateProductConversionNestedDto } from './create-product-conversion-nested.dto';

export class CreateProductDto {
  @ApiProperty({
    description: 'Commercial name of the product',
    example: 'Ibuprofeno 400mg x 10 comprimidos',
    maxLength: 150,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre del producto debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio.' })
  @MaxLength(150, {
    message: 'El nombre del producto no puede exceder los 150 caracteres.',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description or clinical indication',
    example: 'Analgésico y antiinflamatorio no esteroideo de venta libre.',
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

  @ApiProperty({
    description: 'UUID of the associated category',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El categoryId debe ser un UUID válido.' })
  categoryId: string;

  @ApiProperty({
    description: 'UUID of the base unit of measure',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'El baseUnitId debe ser un UUID válido.' })
  baseUnitId: string;

  @ApiPropertyOptional({
    description: 'Minimum stock alert threshold',
    example: 100,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
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
    description:
      'Optional initial stock expressed in the selected base unit. Values greater than zero create an AJUSTE_ENTRADA ledger movement atomically with the product.',
    example: 25,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El stock inicial debe ser un número con hasta 2 decimales.' },
  )
  @Min(0, { message: 'El stock inicial no puede ser negativo.' })
  @Max(999999999999.99, {
    message: 'El stock inicial no puede exceder 999999999999.99.',
  })
  initialStock?: number;

  @ApiProperty({
    description: 'Net purchase cost from supplier in ARS',
    example: 1500.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El costo neto debe ser un número con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El costo neto no puede ser negativo.' })
  @Max(99999999.9999, {
    message: 'El costo neto no puede exceder 99999999.9999.',
  })
  costNet: number;

  @ApiPropertyOptional({
    description: 'Target markup percentage',
    example: 35.0,
    minimum: 0,
    maximum: 1000,
    nullable: true,
  })
  @IsOptional()
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

  @ApiProperty({
    description: 'Current active net selling price in ARS',
    example: 2025.68,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio activo debe ser un número con hasta 2 decimales.' },
  )
  @Min(0, { message: 'El precio activo no puede ser negativo.' })
  @Max(9999999999.99, {
    message: 'El precio activo no puede exceder 9999999999.99.',
  })
  activePriceNet: number;

  @ApiPropertyOptional({
    description: 'VAT treatment applied when selling the product',
    enum: ProductTaxTreatment,
    default: ProductTaxTreatment.GRAVADO,
  })
  @IsOptional()
  @IsEnum(ProductTaxTreatment, {
    message: 'El tratamiento fiscal debe ser GRAVADO, EXENTO o NO_GRAVADO.',
  })
  taxTreatment?: ProductTaxTreatment;

  @ApiPropertyOptional({
    description: 'VAT rate applied when selling the product',
    example: 21,
    default: 21,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La alícuota de IVA debe tener hasta 2 decimales.' },
  )
  @Min(0, { message: 'La alícuota de IVA no puede ser negativa.' })
  @Max(100, { message: 'La alícuota de IVA no puede superar el 100%.' })
  ivaPercentage?: number | null;

  @ApiPropertyOptional({
    description: 'Optional initial unit conversions',
    type: [CreateProductConversionNestedDto],
  })
  @IsOptional()
  @IsArray({ message: 'Las conversiones deben proporcionarse como un array.' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductConversionNestedDto)
  conversions?: CreateProductConversionNestedDto[];
}

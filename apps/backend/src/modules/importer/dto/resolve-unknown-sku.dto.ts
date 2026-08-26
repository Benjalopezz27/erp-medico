import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IResolveUnknownSkuPayload } from '@erp/shared-types';

export class ResolveUnknownSkuDto implements IResolveUnknownSkuPayload {
  @ApiProperty({
    description: 'ID único del proveedor en formato UUID.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'El ID de proveedor es obligatorio.' })
  @IsUUID('4', {
    message: 'El ID de proveedor debe ser un identificador UUID válido.',
  })
  supplierId: string;

  @ApiProperty({
    description:
      'Código o SKU externo provisto por el proveedor para el producto.',
    example: 'PAR-500',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El código de SKU del proveedor es obligatorio.' })
  @IsString({ message: 'El SKU del proveedor debe ser una cadena de texto.' })
  @MaxLength(100, {
    message:
      'El SKU del proveedor no puede exceder el límite de 100 caracteres.',
  })
  supplierSku: string;

  @ApiProperty({
    description:
      'ID único del producto del catálogo interno a asociar en formato UUID.',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'El ID de producto interno es obligatorio.' })
  @IsUUID('4', {
    message: 'El ID de producto debe ser un identificador UUID válido.',
  })
  productId: string;

  @ApiProperty({
    description:
      'ID único de la unidad de compra seleccionada en formato UUID.',
    example: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'La unidad de compra es obligatoria.' })
  @IsUUID('4', {
    message: 'La unidad de compra debe ser un identificador UUID válido.',
  })
  purchaseUnitId: string;

  @ApiProperty({
    description:
      'Factor de conversión numérico que relaciona la unidad de compra con la unidad base del producto. Debe ser 1 si coinciden, o estrictamente > 0 si difieren.',
    example: 50,
  })
  @IsNotEmpty({ message: 'El factor de conversión es obligatorio.' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message:
        'El factor de conversión debe ser un valor numérico con hasta 4 decimales.',
    },
  )
  @IsPositive({
    message: 'El factor de conversión debe ser estrictamente mayor a 0.',
  })
  conversionFactorToBase: number;

  @ApiPropertyOptional({
    description:
      'Descripción opcional provista por el proveedor para el artículo.',
    example: 'Paracetamol 500mg x 50 comp',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({
    message: 'La descripción del proveedor debe ser una cadena de texto.',
  })
  @MaxLength(255, {
    message: 'La descripción no puede exceder los 255 caracteres.',
  })
  supplierDescription?: string | null;

  @ApiPropertyOptional({
    description:
      'Costo neto habitual del proveedor para la asociación de catálogo.',
    example: 890.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El costo debe ser un valor numérico con hasta 4 decimales.' },
  )
  @Min(0, { message: 'El costo no puede ser negativo.' })
  usualCostNet?: number | null;
}

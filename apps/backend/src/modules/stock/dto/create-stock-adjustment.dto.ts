import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsIn,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  StockMovementType,
  StockAdjustmentMovementType,
  ICreateStockAdjustmentDto,
} from '@erp/shared-types';

export class CreateStockAdjustmentDto implements ICreateStockAdjustmentDto {
  @ApiProperty({
    description: 'Product UUID v4',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  productId: string;

  @ApiProperty({
    enum: [
      StockMovementType.AJUSTE_ENTRADA,
      StockMovementType.AJUSTE_SALIDA,
      StockMovementType.MERMA,
    ],
    example: StockMovementType.AJUSTE_ENTRADA,
    description:
      'Adjustment movement type (AJUSTE_ENTRADA, AJUSTE_SALIDA, MERMA)',
  })
  @IsIn(
    [
      StockMovementType.AJUSTE_ENTRADA,
      StockMovementType.AJUSTE_SALIDA,
      StockMovementType.MERMA,
    ],
    {
      message:
        'El tipo de movimiento debe ser AJUSTE_ENTRADA, AJUSTE_SALIDA o MERMA.',
    },
  )
  movementType: StockAdjustmentMovementType;

  @ApiProperty({
    description: 'Positive quantity in base units',
    example: 10.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La cantidad debe tener como máximo 2 decimales.' },
  )
  @IsPositive({
    message: 'La cantidad debe ser un número positivo mayor a cero.',
  })
  quantityBase: number;

  @ApiProperty({
    description: 'Justification / Reason for the adjustment',
    example: 'Corrección después del recuento físico mensual',
  })
  @IsString({ message: 'El motivo debe ser una cadena de texto.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'El motivo es obligatorio y no puede estar vacío.' })
  @MaxLength(500, { message: 'El motivo no puede exceder los 500 caracteres.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Optional external document reference or report',
    example: 'ACTA-2026-001',
  })
  @IsOptional()
  @IsString({
    message: 'La referencia documental debe ser una cadena de texto.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null,
  )
  @MaxLength(100, {
    message: 'La referencia documental no puede exceder los 100 caracteres.',
  })
  documentReference?: string | null;
}

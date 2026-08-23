import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { StockMovementType } from '@erp/shared-types';

export class RecordStockMovementDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El ID de producto debe ser un UUID válido.' })
  productId: string;

  @ApiProperty({
    enum: StockMovementType,
    example: StockMovementType.ENTRADA_COMPRA,
  })
  @IsEnum(StockMovementType, {
    message: 'Tipo de movimiento de stock inválido.',
  })
  movementType: StockMovementType;

  @ApiProperty({
    description: 'Positive quantity in base units',
    example: 100.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'La cantidad en unidad base debe tener a lo sumo 2 decimales.',
    },
  )
  @IsPositive({
    message: 'La cantidad en unidad base debe ser mayor a cero.',
  })
  quantityBase: number;

  @ApiProperty({
    description: 'Reason or justification for the movement',
    example: 'Recepción de compra OC-1004',
  })
  @IsString({ message: 'El motivo debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El motivo es obligatorio y no puede estar vacío.' })
  @MaxLength(500, { message: 'El motivo no puede exceder los 500 caracteres.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'External document reference',
    example: 'FAC-A-0001-00001234',
  })
  @IsOptional()
  @IsString({
    message: 'La referencia documental debe ser una cadena de texto.',
  })
  @MaxLength(100, {
    message: 'La referencia documental no puede exceder los 100 caracteres.',
  })
  documentReference?: string | null;

  @ApiProperty({
    description: 'Actor User UUID',
    example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido.' })
  userId: string;
}

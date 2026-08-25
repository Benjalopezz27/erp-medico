import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsString,
  MaxLength,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateQuarantineDto {
  @ApiProperty({
    description: 'Product UUID v4',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  productId: string;

  @ApiProperty({
    description: 'Positive quantity to quarantine in base units',
    example: 10.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La cantidad debe tener como máximo 2 decimales.' },
  )
  @IsPositive({
    message: 'La cantidad debe ser un número positivo mayor a cero.',
  })
  @Max(9999999999.99, {
    message:
      'La cantidad no puede superar el límite permitido de 9.999.999.999,99 unidades.',
  })
  quantityBase: number;

  @ApiProperty({
    description: 'Reason for quarantine entry',
    example: 'Cajas húmedas detectadas en recepción',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El motivo debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El motivo es obligatorio y no puede estar vacío.' })
  @MaxLength(255, {
    message: 'El motivo no puede superar los 255 caracteres.',
  })
  reason: string;
}

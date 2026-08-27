import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoodsReceiptItemDto {
  @ApiProperty({
    description: 'ID del ítem de la orden de compra que se está recibiendo',
    example: '33333333-3333-4333-a333-333333333333',
  })
  @IsUUID('4', {
    message: 'El ID del ítem de la orden de compra debe ser un UUID válido.',
  })
  @IsNotEmpty({
    message: 'El ID del ítem de la orden de compra es obligatorio.',
  })
  purchaseOrderItemId: string;

  @ApiProperty({
    description:
      'Cantidad recibida en la unidad de compra de la orden (máximo 4 decimales)',
    example: 10.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message:
        'La cantidad a recibir debe ser un número con un máximo de 4 decimales.',
    },
  )
  @IsPositive({
    message: 'La cantidad a recibir debe ser un número positivo mayor a cero.',
  })
  @Type(() => Number)
  receivedQtyPurchaseUnit: number;

  @ApiPropertyOptional({
    description:
      'Costo neto provisional por unidad de compra. Si se omite, se usa el costo esperado de la orden de compra',
    example: 1250.5,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message:
        'El costo provisional debe ser un número con un máximo de 4 decimales.',
    },
  )
  @Min(0, {
    message: 'El costo provisional debe ser un número no negativo.',
  })
  @Type(() => Number)
  provisionalCostUnitNet?: number | null;
}

export class CreateGoodsReceiptDto {
  @ApiProperty({
    description: 'Número de remito físico entregado por el proveedor',
    example: '0001-00001234',
    maxLength: 50,
  })
  @IsString({ message: 'El número de remito debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El número de remito es obligatorio.' })
  @MaxLength(50, {
    message: 'El número de remito no puede superar los 50 caracteres.',
  })
  deliveryNoteNumber: string;

  @ApiProperty({
    description: 'Líneas recibidas en este remito',
    type: [CreateGoodsReceiptItemDto],
  })
  @IsArray({ message: 'Los ítems de recepción deben ser un arreglo.' })
  @ArrayMinSize(1, {
    message: 'Debe incluir al menos un ítem para registrar la recepción.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];
}

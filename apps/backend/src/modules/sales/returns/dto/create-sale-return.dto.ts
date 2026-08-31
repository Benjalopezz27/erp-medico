import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleReturnItemQuality } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateSaleReturnItemDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID del ítem original de la venta',
  })
  @IsUUID('4')
  saleItemId: string;

  @ApiProperty({
    example: 2,
    description: 'Cantidad a devolver en unidad base',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityBase: number;

  @ApiProperty({
    enum: SaleReturnItemQuality,
    example: SaleReturnItemQuality.APTO,
  })
  @IsEnum(SaleReturnItemQuality)
  quality: SaleReturnItemQuality;

  @ApiPropertyOptional({ example: 'Observaciones de la línea de devolución' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateSaleReturnDto {
  @ApiProperty({
    example: 'Devolución de mercadería defectuosa',
    minLength: 3,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason: string;

  @ApiPropertyOptional({
    description: 'Clave de idempotencia única por intento de devolución',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string | null;

  @ApiProperty({ type: [CreateSaleReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleReturnItemDto)
  items: CreateSaleReturnItemDto[];
}

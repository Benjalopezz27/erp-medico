import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  productId: string;

  @ApiProperty({ example: 2.5, description: 'Cantidad en unidad base' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityBase: number;

  @IsOptional()
  unitPriceNet?: unknown;

  @IsOptional()
  catalogPriceNet?: unknown;

  @IsOptional()
  discountPercentage?: unknown;

  @IsOptional()
  discountAmountNet?: unknown;

  @IsOptional()
  subtotalNet?: unknown;

  @IsOptional()
  taxTreatment?: unknown;

  @IsOptional()
  ivaPercentage?: unknown;

  @IsOptional()
  ivaAmount?: unknown;

  @IsOptional()
  subtotalGross?: unknown;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  customerId?: string | null;

  @ApiProperty({ default: false })
  @IsBoolean()
  isCreditSale: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  requiresFiscalInvoice: boolean;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsOptional()
  totalNet?: unknown;

  @IsOptional()
  taxableNet?: unknown;

  @IsOptional()
  exemptAmount?: unknown;

  @IsOptional()
  nonTaxedAmount?: unknown;

  @IsOptional()
  ivaTotal?: unknown;

  @IsOptional()
  totalGross?: unknown;
}

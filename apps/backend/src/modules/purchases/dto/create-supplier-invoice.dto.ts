import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DECIMAL_4 = /^\d{1,20}(?:\.\d{1,4})?$/;
const POSITIVE_DECIMAL_4 = /^(?!0+(?:\.0+)?$)\d{1,20}(?:\.\d{1,4})?$/;

export class CreateSupplierInvoiceItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  goodsReceiptItemId: string;

  @ApiProperty({ example: '10.0000' })
  @IsString()
  @Matches(POSITIVE_DECIMAL_4, {
    message:
      'La cantidad facturada debe ser un decimal positivo con hasta 4 decimales.',
  })
  invoicedQtyPurchaseUnit: string;

  @ApiProperty({ example: '1250.5000' })
  @IsString()
  @Matches(DECIMAL_4, {
    message:
      'El precio unitario debe ser un decimal no negativo con hasta 4 decimales.',
  })
  unitPriceNet: string;

  @ApiPropertyOptional({ example: '0.0000', default: '0.0000' })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_4)
  discountNet?: string;

  @ApiPropertyOptional({ example: '0.0000', default: '0.0000' })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_4)
  bonusNet?: string;

  @ApiPropertyOptional({ example: '0.0000', default: '0.0000' })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_4)
  surchargeNet?: string;
}

export class CreateSupplierInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  goodsReceiptId: string;

  @ApiProperty({ example: 'A 0001-00001234', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  invoiceNumber: string;

  @ApiProperty({ example: '2026-08-27', pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  invoiceDate: string;

  @ApiProperty({ example: '2180.7500' })
  @IsString()
  @Matches(DECIMAL_4, {
    message: 'El IVA debe ser un decimal no negativo con hasta 4 decimales.',
  })
  taxTotal: string;

  @ApiProperty({ type: [CreateSupplierInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierInvoiceItemDto)
  items: CreateSupplierInvoiceItemDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerSpecialPriceMode } from '@erp/shared-types';
import {
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCustomerSpecialPriceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: CustomerSpecialPriceMode })
  @IsEnum(CustomerSpecialPriceMode)
  mode: CustomerSpecialPriceMode;

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  specialPriceNet?: string;

  @ApiPropertyOptional({ example: '10.0000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  discountPercentage?: string;
}

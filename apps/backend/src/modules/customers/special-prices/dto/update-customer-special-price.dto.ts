import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerSpecialPriceMode } from '@erp/shared-types';
import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCustomerSpecialPriceDto {
  @ApiProperty({
    minimum: 1,
    description: 'Versión recibida en la última lectura',
  })
  @IsInt()
  @Min(1)
  expectedVersion: number;

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

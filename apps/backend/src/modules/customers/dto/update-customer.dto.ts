import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';

const optionalText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName?: string;

  @ApiPropertyOptional({ enum: CustomerDocumentType })
  @IsOptional()
  @IsEnum(CustomerDocumentType)
  documentType?: CustomerDocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cuitOrDni?: string;

  @ApiPropertyOptional({ enum: TaxCondition })
  @IsOptional()
  @IsEnum(TaxCondition)
  taxCondition?: TaxCondition;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ example: '50000.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  creditLimit?: string;
}

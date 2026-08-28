import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';

const optionalText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateCustomerDto {
  @ApiProperty({ example: 'Farmacia San Martín S.A.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName: string;

  @ApiProperty({ enum: CustomerDocumentType })
  @IsEnum(CustomerDocumentType)
  documentType: CustomerDocumentType;

  @ApiProperty({ example: '30-50001091-2' })
  @IsString()
  @MaxLength(20)
  cuitOrDni: string;

  @ApiProperty({ enum: TaxCondition })
  @IsEnum(TaxCondition)
  taxCondition: TaxCondition;

  @ApiPropertyOptional({ example: 'contacto@farmacia.com', nullable: true })
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

  @ApiPropertyOptional({ example: '50000.00', default: '0.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  creditLimit?: string;
}

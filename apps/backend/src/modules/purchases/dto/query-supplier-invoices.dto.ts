import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierInvoiceStatus } from '@erp/shared-types';

export class QuerySupplierInvoicesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
  @ApiPropertyOptional({ enum: SupplierInvoiceStatus })
  @IsOptional()
  @IsEnum(SupplierInvoiceStatus)
  status?: SupplierInvoiceStatus;
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;
  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

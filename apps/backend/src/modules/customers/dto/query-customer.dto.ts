import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerSortField, TaxCondition } from '@erp/shared-types';

export class QueryCustomerDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ description: 'Razón social o DNI/CUIT' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: TaxCondition })
  @IsOptional()
  @IsEnum(TaxCondition)
  taxCondition?: TaxCondition;

  @ApiPropertyOptional({ description: 'Por defecto se consultan solo activos' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: [
      'businessName',
      'cuitOrDni',
      'taxCondition',
      'creditLimit',
      'createdAt',
      'updatedAt',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn([
    'businessName',
    'cuitOrDni',
    'taxCondition',
    'creditLimit',
    'createdAt',
    'updatedAt',
  ])
  sortBy: CustomerSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC', 'asc', 'desc'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';
}

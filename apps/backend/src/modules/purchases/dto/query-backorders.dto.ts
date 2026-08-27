import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { IBackorderSearchParams } from '@erp/shared-types';

export class QueryBackordersDto implements IBackorderSearchParams {
  @ApiPropertyOptional({
    description:
      'Busca por número de OC, proveedor, CUIT, código o nombre del producto y SKU del proveedor',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'UUID del proveedor' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Devuelve únicamente órdenes con más de 14 días calendario',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  urgentOnly?: boolean;
}

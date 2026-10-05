import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArcaStatus, FiscalDocumentType } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { SortableQuery } from '../../../common/sorting/sorting';

export const PENDING_FISCAL_SORT_FIELDS = [
  'saleNumber',
  'customer',
  'createdAt',
  'type',
  'status',
  'amount',
  'attempts',
  'lastAttemptAt',
  'nextAttemptAt',
] as const;

export class QueryPendingFiscalDto extends SortableQuery(
  PENDING_FISCAL_SORT_FIELDS,
) {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: [ArcaStatus.PENDIENTE_FACTURACION, ArcaStatus.RECHAZADO],
    description: 'Sólo documentos pendientes o rechazados son listables aquí.',
  })
  @IsOptional()
  @IsEnum(ArcaStatus)
  status?: ArcaStatus;

  @ApiPropertyOptional({ enum: FiscalDocumentType })
  @IsOptional()
  @IsEnum(FiscalDocumentType)
  documentType?: FiscalDocumentType;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Búsqueda por número de venta o razón social del cliente.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

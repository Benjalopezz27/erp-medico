import {
  IsOptional,
  IsUUID,
  IsEnum,
  Matches,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@erp/shared-types';

import { SortableQuery } from '../../../common/sorting/sorting';

export const PURCHASE_ORDER_SORT_FIELDS = [
  'orderNumber',
  'supplier',
  'createdAt',
  'emittedAt',
  'status',
  'totalNet',
] as const;

export class QueryPurchaseOrderDto extends SortableQuery(
  PURCHASE_ORDER_SORT_FIELDS,
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

  @ApiPropertyOptional({ description: 'Filter by Supplier UUID' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @ApiPropertyOptional({
    enum: PurchaseOrderStatus,
    description: 'Filter by PO status',
  })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({
    description: 'Filter from creation date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom must be in YYYY-MM-DD format',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter to creation date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo must be in YYYY-MM-DD format',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Search term for order number or supplier business name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

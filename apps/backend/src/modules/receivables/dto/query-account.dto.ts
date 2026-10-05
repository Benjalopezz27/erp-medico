import { ApiPropertyOptional } from '@nestjs/swagger';
import { DebtorStatus } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SortableQuery } from '../../../common/sorting/sorting';

export class QueryLedgerDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export const DEBTOR_SORT_FIELDS = [
  'businessName',
  'pendingCount',
  'aging0to30',
  'aging31to60',
  'aging60Plus',
  'totalBalance',
  'oldestDebtDate',
] as const;

/** QueryLedgerDto paging plus whitelisted sorting (a class cannot extend both). */
export function SortableLedgerQuery<const TField extends string>(
  fields: readonly TField[],
) {
  class SortableLedgerQueryDto extends SortableQuery(fields) {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;
  }
  return SortableLedgerQueryDto;
}

export class QueryDebtorsDto extends SortableLedgerQuery(DEBTOR_SORT_FIELDS) {
  @ApiPropertyOptional({ description: 'Nombre o documento del cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: DebtorStatus })
  @IsOptional()
  @IsEnum(DebtorStatus)
  status?: DebtorStatus;
}

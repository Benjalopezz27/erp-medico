import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckStatus } from '@erp/shared-types';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SortableLedgerQuery } from '../../receivables/dto/query-account.dto';

export const CHECK_SORT_FIELDS = [
  'bank',
  'checkNumber',
  'customer',
  'amount',
  'dueDate',
  'status',
] as const;

export class QueryChecksDto extends SortableLedgerQuery(CHECK_SORT_FIELDS) {
  @ApiPropertyOptional({ enum: CheckStatus })
  @IsOptional()
  @IsEnum(CheckStatus)
  status?: CheckStatus;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Vencimiento desde',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dueFrom?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Vencimiento hasta',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dueTo?: string;
}

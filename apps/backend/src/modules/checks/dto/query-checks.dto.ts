import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckStatus } from '@erp/shared-types';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { QueryLedgerDto } from '../../receivables/dto/query-account.dto';

export class QueryChecksDto extends QueryLedgerDto {
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

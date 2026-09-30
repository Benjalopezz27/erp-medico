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

export class QueryDebtorsDto extends QueryLedgerDto {
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

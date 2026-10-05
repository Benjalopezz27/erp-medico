import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ManualTreasuryAccountType,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { SortableLedgerQuery } from '../../receivables/dto/query-account.dto';

export const TREASURY_MOVEMENT_SORT_FIELDS = [
  'createdAt',
  'account',
  'movementType',
  'amount',
  'concept',
  'user',
] as const;

export class QueryTreasuryMovementsDto extends SortableLedgerQuery(
  TREASURY_MOVEMENT_SORT_FIELDS,
) {
  @ApiPropertyOptional({ enum: TreasuryAccountType })
  @IsOptional()
  @IsEnum(TreasuryAccountType)
  accountType?: TreasuryAccountType;

  @ApiPropertyOptional({ enum: TreasuryMovementType })
  @IsOptional()
  @IsEnum(TreasuryMovementType)
  movementType?: TreasuryMovementType;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}

export class CreateTreasuryMovementDto {
  @ApiProperty({
    enum: [TreasuryAccountType.EFECTIVO, TreasuryAccountType.BANCOS],
  })
  @IsIn([TreasuryAccountType.EFECTIVO, TreasuryAccountType.BANCOS])
  accountType: ManualTreasuryAccountType;

  @ApiProperty({ enum: TreasuryMovementType })
  @IsEnum(TreasuryMovementType)
  movementType: TreasuryMovementType;

  @ApiProperty({ example: '10000.00' })
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message: 'El monto debe ser un decimal positivo con hasta 2 decimales.',
  })
  amount: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(1, 200)
  concept: string;
}

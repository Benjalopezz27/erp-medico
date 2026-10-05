import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { OperatingCurrency, TaxCondition } from '@erp/shared-types';
import { IsValidCuit } from '../../suppliers/validators/is-cuit.validator';

export class UpdateSystemConfigDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  issuerRazonSocial?: string;

  @ApiPropertyOptional({ example: '20123456786' })
  @IsOptional()
  @IsValidCuit()
  issuerCuit?: string;

  @ApiPropertyOptional({ enum: TaxCondition })
  @IsOptional()
  @IsEnum(TaxCondition)
  issuerTaxCondition?: TaxCondition;

  @ApiPropertyOptional({ minimum: 1, maximum: 99999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99999)
  arcaPuntoVenta?: number;

  @ApiPropertyOptional({ enum: ['ARS', 'USD'] })
  @IsOptional()
  @IsIn(['ARS', 'USD'])
  operatingCurrency?: OperatingCurrency;
}

import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceReviewApprovalMode } from '@erp/shared-types';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ApprovePriceReviewDto {
  @ApiProperty({ enum: PriceReviewApprovalMode })
  @IsEnum(PriceReviewApprovalMode)
  mode: PriceReviewApprovalMode;

  @ApiPropertyOptional({ example: '165.50' })
  @IsOptional()
  @IsString()
  customPriceNet?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class OptionalPriceReviewReasonDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

export class RejectPriceReviewDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

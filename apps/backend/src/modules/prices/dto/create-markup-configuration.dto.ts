import { Transform } from 'class-transformer';
import { IsDecimal, IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarkupLevel } from '@erp/shared-types';

export class CreateMarkupConfigurationDto {
  @ApiProperty({ enum: MarkupLevel })
  @IsEnum(MarkupLevel)
  level: MarkupLevel;

  @ApiProperty({ example: '25.0000', type: String })
  @Transform(({ value }) => String(value).trim())
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  percentage: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf(
    (dto: CreateMarkupConfigurationDto) => dto.level === MarkupLevel.CATEGORY,
  )
  @IsUUID('4')
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf(
    (dto: CreateMarkupConfigurationDto) => dto.level === MarkupLevel.PRODUCT,
  )
  @IsUUID('4')
  productId?: string | null;
}

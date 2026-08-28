import { Transform } from 'class-transformer';
import { IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMarkupConfigurationDto {
  @ApiProperty({ example: '30.0000', type: String })
  @Transform(({ value }) => String(value).trim())
  @IsDecimal({ decimal_digits: '0,4', force_decimal: false })
  percentage: string;
}

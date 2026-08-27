import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdatePurchaseSettingsDto {
  @ApiProperty({ example: '5.0000', minimum: 0, maximum: 100 })
  @IsString()
  @Matches(/^\d{1,3}(?:\.\d{1,4})?$/, {
    message:
      'La tolerancia debe ser un porcentaje entre 0 y 100 con hasta 4 decimales.',
  })
  costTolerancePercentage: string;
}

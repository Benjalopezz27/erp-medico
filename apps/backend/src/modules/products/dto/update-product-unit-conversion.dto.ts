import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductUnitConversionDto {
  @ApiProperty({
    description:
      'Updated conversion factor (1 presentation unit = N base units)',
    example: 30.0,
    minimum: 0.0001,
    maximum: 999999.9999,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message:
        'El factor de conversión debe ser un número con hasta 4 decimales.',
    },
  )
  @Min(0.0001, {
    message: 'El factor de conversión debe ser mayor que 0 (mínimo 0.0001).',
  })
  @Max(999999.9999, {
    message: 'El factor de conversión no puede exceder 999999.9999.',
  })
  conversionFactor: number;
}

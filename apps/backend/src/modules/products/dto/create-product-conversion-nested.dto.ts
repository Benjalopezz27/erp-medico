import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductConversionNestedDto {
  @ApiProperty({
    description: 'UUID of the presentation unit',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El presentationUnitId debe ser un UUID válido.' })
  presentationUnitId: string;

  @ApiProperty({
    description:
      'Conversion factor representing how many base units equal 1 presentation unit',
    example: 100,
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

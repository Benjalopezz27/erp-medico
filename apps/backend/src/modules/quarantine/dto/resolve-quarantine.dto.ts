import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { QuarantineResolution } from '@erp/shared-types';

export class ResolveQuarantineDto {
  @ApiProperty({
    description: 'Resolution action for the quarantine entry',
    enum: QuarantineResolution,
    example: QuarantineResolution.REINGRESO,
  })
  @IsEnum(QuarantineResolution, {
    message:
      'La resolución debe ser MERMA, DEVOLUCION_PROVEEDOR o REINGRESO.',
  })
  resolution: QuarantineResolution;

  @ApiProperty({
    description: 'Mandatory notes explaining the resolution',
    example: 'Mercadería inspeccionada por control de calidad, apta para venta',
    minLength: 3,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Las notas de resolución deben ser una cadena de texto.' })
  @IsNotEmpty({
    message: 'Las notas de resolución son obligatorias y no pueden estar vacías.',
  })
  @MinLength(3, {
    message: 'Las notas de resolución deben tener al menos 3 caracteres.',
  })
  @MaxLength(1000, {
    message: 'Las notas de resolución no pueden superar los 1000 caracteres.',
  })
  resolutionNotes: string;
}

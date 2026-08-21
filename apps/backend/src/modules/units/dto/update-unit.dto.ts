import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUnitDto {
  @ApiPropertyOptional({
    example: 'Caja Master',
    description: 'Nuevo nombre de la unidad de medida',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser una cadena vacía' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    example: 'cjm',
    description: 'Nuevo símbolo de la unidad de medida',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'El símbolo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El símbolo no puede ser una cadena vacía' })
  @MaxLength(20, { message: 'El símbolo no puede exceder los 20 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  symbol?: string;
}

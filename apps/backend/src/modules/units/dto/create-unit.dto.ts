import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUnitDto {
  @ApiProperty({
    example: 'Unidad',
    description: 'Nombre único de la unidad de medida',
    maxLength: 50,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la unidad es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede exceder los 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiProperty({
    example: 'u',
    description: 'Símbolo único de la unidad de medida',
    maxLength: 20,
  })
  @IsString({ message: 'El símbolo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El símbolo de la unidad es obligatorio' })
  @MaxLength(20, { message: 'El símbolo no puede exceder los 20 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  symbol!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchProductsDto {
  @ApiProperty({
    description:
      'Search query matching internalCode or name (minimum 2 characters)',
    example: 'P0001',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, {
    message: 'El término de búsqueda debe tener al menos 2 caracteres.',
  })
  @MaxLength(100, {
    message: 'El término de búsqueda no puede exceder 100 caracteres.',
  })
  q: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser al menos 1.' })
  @Max(50, { message: 'El límite no puede exceder 50.' })
  limit?: number = 10;
}

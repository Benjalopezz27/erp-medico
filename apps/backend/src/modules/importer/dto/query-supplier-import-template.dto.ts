import { IsString, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySupplierImportTemplateDto {
  @ApiPropertyOptional({
    description: 'Filtrar plantillas por nombre (búsqueda parcial)',
    example: '3M',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por fingerprint exacto de encabezados (64 caracteres hex)',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'El fingerprint debe ser un hash SHA-256 válido de 64 caracteres.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  headerFingerprint?: string;
}

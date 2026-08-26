import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierImportMappingDto } from './supplier-import-mapping.dto';
import { ICreateSupplierImportTemplatePayload } from '@erp/shared-types';

export class CreateSupplierImportTemplateDto implements ICreateSupplierImportTemplatePayload {
  @ApiProperty({
    example: 'Lista de Precios 3M Oficial',
    description: 'Nombre descriptivo de la plantilla para el proveedor',
  })
  @IsString({
    message: 'El nombre de la plantilla debe ser una cadena de texto.',
  })
  @IsNotEmpty({ message: 'El nombre de la plantilla es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description:
      'SHA-256 fingerprint de la secuencia de encabezados normalizados',
  })
  @IsString({ message: 'El fingerprint debe ser una cadena de texto.' })
  @Matches(/^[a-f0-9]{64}$/i, {
    message:
      'El fingerprint debe ser un hash SHA-256 válido de 64 caracteres hexadecimales.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  headerFingerprint: string;

  @ApiProperty({
    example: ['cod_articulo', 'descripcion', 'precio', 'unidad'],
    description:
      'Lista de encabezados del archivo para el snapshot de compatibilidad',
  })
  @IsArray({ message: 'Los encabezados deben enviarse como un array.' })
  @ArrayMinSize(2, { message: 'Debe proporcionar al menos 2 encabezados.' })
  @IsString({
    each: true,
    message: 'Cada encabezado debe ser una cadena de texto.',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  headers: string[];

  @ApiProperty({ type: SupplierImportMappingDto })
  @ValidateNested()
  @Type(() => SupplierImportMappingDto)
  mapping: SupplierImportMappingDto;
}

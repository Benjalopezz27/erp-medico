import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class ImporterConfirmMultipartDto {
  @ApiProperty({
    description: 'UUID del proveedor activo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID del proveedor debe ser un UUID v4 válido.' })
  @IsNotEmpty({ message: 'El ID del proveedor es obligatorio.' })
  supplierId: string;

  @ApiProperty({
    description: 'Configuración de mapeo de columnas serializada en JSON',
    example:
      '{"supplierSku":"sku","usualCostNet":"costo","supplierDescription":"desc","rawQuantity":"cant","purchaseUnit":"unidad"}',
  })
  @IsString({ message: 'El mapeo debe ser una cadena JSON válida.' })
  @IsNotEmpty({ message: 'El mapeo de columnas es obligatorio.' })
  mapping: string;

  @ApiProperty({
    description: 'Checksum SHA-256 esperado del archivo original',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/i, {
    message:
      'El checksum esperado del archivo debe ser una cadena hexadecimal de 64 caracteres.',
  })
  @IsNotEmpty()
  expectedFileChecksum: string;

  @ApiProperty({
    description: 'Checksum SHA-256 esperado del mapeo canónico validado',
    example: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
  })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/i, {
    message:
      'El checksum esperado del mapeo debe ser una cadena hexadecimal de 64 caracteres.',
  })
  @IsNotEmpty()
  expectedMappingChecksum: string;

  @ApiProperty({
    description:
      'Checksum SHA-256 esperado del contenido canónico de la vista previa',
    example: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/i, {
    message:
      'El checksum esperado del contenido debe ser una cadena hexadecimal de 64 caracteres.',
  })
  @IsNotEmpty()
  expectedContentChecksum: string;

  @ApiPropertyOptional({
    description:
      'UUID de la plantilla de importación utilizada (opcional, para trazabilidad)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la plantilla debe ser un UUID v4 válido.' })
  templateId?: string;
}

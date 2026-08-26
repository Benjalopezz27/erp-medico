import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class ImporterPreviewMultipartDto {
  @ApiProperty({
    description: 'ID único del proveedor en formato UUID.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'El ID de proveedor es obligatorio.' })
  @IsUUID('4', {
    message: 'El ID de proveedor debe ser un identificador UUID válido.',
  })
  supplierId: string;

  @ApiProperty({
    description:
      'Checksum SHA-256 esperado del archivo original retornado durante el paso 1 (upload).',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsNotEmpty({ message: 'El checksum esperado del archivo es obligatorio.' })
  @IsString({
    message: 'El checksum del archivo debe ser una cadena de texto.',
  })
  @Length(64, 64, {
    message:
      'El checksum del archivo debe tener exactamente 64 caracteres SHA-256 hexadecimales.',
  })
  expectedFileChecksum: string;

  @ApiProperty({
    description:
      'Mapeo de columnas serializado en JSON string que vincula campos del sistema con encabezados normalizados del archivo.',
    example:
      '{"supplierSku":"cod prov","usualCostNet":"costo unit","supplierDescription":"desc","rawQuantity":"bulto","purchaseUnit":"unidad"}',
  })
  @IsNotEmpty({ message: 'El mapeo de columnas es obligatorio.' })
  @IsString({
    message: 'El mapeo de columnas debe ser una cadena JSON válida.',
  })
  @MaxLength(32768, {
    message:
      'El contenido del mapeo de columnas supera el tamaño máximo permitido de 32 KB.',
  })
  mapping: string;
}

import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmStockBulkLoadDto {
  @ApiProperty({
    description:
      'SHA-256 binary hash returned during preview to ensure file integrity',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsNotEmpty({ message: 'El checksum de previsualización es obligatorio.' })
  @IsString({
    message: 'El checksum de previsualización debe ser una cadena de texto.',
  })
  @Length(64, 64, {
    message:
      'El checksum de previsualización debe tener exactamente 64 caracteres.',
  })
  @Matches(/^[0-9a-f]{64}$/, {
    message:
      'El checksum de previsualización debe ser un hash SHA-256 válido en minúsculas.',
  })
  previewFileChecksum: string;
}

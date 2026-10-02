import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ConfirmProductBulkLoadDto {
  @ApiProperty({
    description: 'SHA-256 checksum of the validated preview file',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsNotEmpty({ message: 'El checksum del archivo es obligatorio.' })
  @IsString({ message: 'El checksum del archivo debe ser una cadena.' })
  @Matches(/^[0-9a-f]{64}$/, {
    message:
      'El previewFileChecksum debe ser un hash SHA-256 hexadecimal válido de 64 caracteres.',
  })
  previewFileChecksum: string;
}

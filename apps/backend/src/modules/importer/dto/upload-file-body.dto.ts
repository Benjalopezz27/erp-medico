import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UploadFileBodyDto {
  @ApiProperty({
    description: 'UUID de un proveedor activo',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'El ID del proveedor debe ser un UUID válido.' })
  supplierId: string;
}

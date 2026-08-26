import { ApiProperty } from '@nestjs/swagger';
import {
  ISupplierImportTemplate,
  ISupplierImportMapping,
} from '@erp/shared-types';
import { SupplierImportMappingDto } from './supplier-import-mapping.dto';

export class SupplierImportTemplateResponseDto implements ISupplierImportTemplate {
  @ApiProperty({ example: 'c7a8b9e1-2f34-4a56-b789-0123456789ab' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  supplierId: string;

  @ApiProperty({ example: 'Lista de Precios 3M Oficial' })
  name: string;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  headerFingerprint: string;

  @ApiProperty({
    example: [
      'cod_articulo',
      'descripcion_prod',
      'precio_unitario',
      'unidad_medida',
    ],
    type: [String],
  })
  headers: string[];

  @ApiProperty({ type: SupplierImportMappingDto })
  mapping: ISupplierImportMapping;

  @ApiProperty({ example: '2026-08-26T15:00:00.000Z' })
  createdAt: Date | string;

  @ApiProperty({ example: '2026-08-26T15:00:00.000Z' })
  updatedAt: Date | string;
}

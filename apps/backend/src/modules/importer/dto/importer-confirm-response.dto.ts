import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IImporterConfirmResponse,
  IImporterSupplierSummary,
  IImporterBatchDetailResponse,
  IImporterBatchItemSummary,
} from '@erp/shared-types';
import { ImporterSupplierSummaryDto } from './importer-upload-response.dto';

export class ImporterConfirmResponseDto implements IImporterConfirmResponse {
  @ApiProperty({
    description: 'UUID del lote de importación confirmado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  batchId: string;

  @ApiProperty({
    description: 'Resumen del proveedor',
    type: ImporterSupplierSummaryDto,
  })
  supplier: IImporterSupplierSummary;

  @ApiProperty({
    description: 'Nombre del archivo original',
    example: 'lista_precios_2026.xlsx',
  })
  fileName: string;

  @ApiProperty({
    description: 'Checksum SHA-256 del archivo procesado',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  fileChecksum: string;

  @ApiProperty({
    description: 'Checksum SHA-256 del mapeo canónico aplicado',
    example: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
  })
  mappingChecksum: string;

  @ApiProperty({
    description: 'Checksum SHA-256 del contenido canónico confirmado',
    example: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  })
  contentChecksum: string;

  @ApiProperty({
    description: 'Total de filas de datos en el archivo',
    example: 100,
  })
  totalRows: number;

  @ApiProperty({
    description: 'Total de filas aplicadas exitosamente',
    example: 100,
  })
  appliedRows: number;

  @ApiProperty({
    description: 'Cantidad de asociaciones cuyo costo o descripción cambió',
    example: 42,
  })
  changedRows: number;

  @ApiProperty({
    description: 'Cantidad de asociaciones que no presentaron modificaciones',
    example: 58,
  })
  unchangedRows: number;

  @ApiProperty({
    description: 'Fecha y hora ISO de confirmación',
    example: '2026-08-26T14:00:00.000Z',
  })
  confirmedAt: string;

  @ApiPropertyOptional({
    description: 'UUID de la plantilla de importación vinculada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  templateId?: string | null;
}

export class ImporterBatchItemSummaryDto implements IImporterBatchItemSummary {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 2 })
  rowNumber: number;

  @ApiProperty({ example: 'MED-001' })
  supplierSku: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  productId: string;

  @ApiProperty({ example: '1200.0000', nullable: true })
  previousCostNet: string | null;

  @ApiProperty({ example: '1250.5000' })
  newCostNet: string;

  @ApiProperty({ example: true })
  costChanged: boolean;

  @ApiProperty({ example: 'Ibuprofeno 400mg', nullable: true })
  previousDescription: string | null;

  @ApiProperty({ example: 'Ibuprofeno 400mg x 100', nullable: true })
  newDescription: string | null;

  @ApiProperty({ example: true })
  descriptionChanged: boolean;
}

export class ImporterBatchDetailResponseDto implements IImporterBatchDetailResponse {
  @ApiProperty({ type: ImporterConfirmResponseDto })
  batch: IImporterConfirmResponse;

  @ApiProperty({ type: [ImporterBatchItemSummaryDto] })
  items: IImporterBatchItemSummary[];
}

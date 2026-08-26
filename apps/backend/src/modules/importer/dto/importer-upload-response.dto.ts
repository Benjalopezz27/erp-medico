import { ApiProperty } from '@nestjs/swagger';
import type {
  IImporterSampleRow,
  IImporterSupplierSummary,
  IImporterUploadResponse,
} from '@erp/shared-types';

export class ImporterSupplierSummaryDto implements IImporterSupplierSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Droguería Médica Central S.A.' })
  businessName: string;

  @ApiProperty({ example: '30712345678' })
  cuit: string;
}

export class ImporterSampleRowDto implements IImporterSampleRow {
  @ApiProperty({ example: 2 })
  rowNumber: number;

  @ApiProperty({
    type: 'array',
    items: { oneOf: [{ type: 'string' }, { type: 'null' }] },
    example: ['MED-001', 'Ibuprofeno 400mg', '1250.50', null],
  })
  cells: Array<string | null>;
}

export class ImporterUploadResponseDto implements IImporterUploadResponse {
  @ApiProperty({ type: ImporterSupplierSummaryDto })
  supplier: ImporterSupplierSummaryDto;

  @ApiProperty({ example: 'lista_precios.xlsx' })
  fileName: string;

  @ApiProperty({ example: 25410 })
  fileSize: number;

  @ApiProperty({
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  clientMimeType: string;

  @ApiProperty({ enum: ['csv', 'xlsx'] })
  detectedFormat: 'csv' | 'xlsx';

  @ApiProperty({ description: 'SHA-256 hexadecimal del archivo original' })
  fileChecksum: string;

  @ApiProperty({ description: 'SHA-256 de los encabezados normalizados' })
  headerFingerprint: string;

  @ApiProperty({ type: [String] })
  headers: string[];

  @ApiProperty({ type: [String] })
  normalizedHeaders: string[];

  @ApiProperty({ example: 145 })
  totalRows: number;

  @ApiProperty({ example: 4 })
  totalColumns: number;

  @ApiProperty({ type: [ImporterSampleRowDto] })
  sampleRows: ImporterSampleRowDto[];
}

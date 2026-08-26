import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IImporterPreviewResponse,
  IImporterPreviewSummary,
  IImporterValidRow,
  IImporterUnknownRow,
  IImporterErrorRow,
  IImporterRowError,
  IImporterProductReference,
  ImporterRowErrorCode,
  ImporterSemanticField,
} from '@erp/shared-types';
import { ImporterSupplierSummaryDto } from './importer-upload-response.dto';

export class ImporterRowErrorDto implements IImporterRowError {
  @ApiProperty({
    example: 2,
    description: 'Número de fila en el archivo original.',
  })
  rowNumber: number;

  @ApiProperty({
    example: 'usualCostNet',
    description: 'Campo semántico del sistema donde se originó el error.',
  })
  field: ImporterSemanticField;

  @ApiProperty({
    enum: ImporterRowErrorCode,
    example: ImporterRowErrorCode.ROW_COST_NEGATIVE,
    description: 'Código canónico del error de fila.',
  })
  code: ImporterRowErrorCode;

  @ApiProperty({
    example: 'El costo neto debe ser mayor a cero.',
    description: 'Mensaje explicativo del error en español.',
  })
  message: string;

  @ApiPropertyOptional({
    example: '-150.00',
    description: 'Valor original recibido en la celda.',
  })
  rawValue?: string | number | boolean | null;
}

export class ImporterProductReferenceDto implements IImporterProductReference {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'P0001' })
  internalCode: string;

  @ApiProperty({ example: 'Ibuprofeno 400mg x 100' })
  name: string;

  @ApiProperty({
    example: {
      id: 'u-comp-uuid',
      name: 'Comprimido',
      symbol: 'COMP',
    },
  })
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export class ImporterValidRowDto implements IImporterValidRow {
  @ApiProperty({ example: 2 })
  rowNumber: number;

  @ApiProperty({ example: 'MED-001' })
  rawSku: string;

  @ApiProperty({ example: 'MED-001' })
  normalizedSku: string;

  @ApiPropertyOptional({ example: 'Ibuprofeno 400mg' })
  supplierDescription?: string | null;

  @ApiProperty({ example: '1250.5000' })
  usualCostNet: string;

  @ApiPropertyOptional({ example: '100' })
  rawQuantity?: string | null;

  @ApiPropertyOptional({ example: '100.0000' })
  quantityCanonical?: string | null;

  @ApiPropertyOptional({ example: 'Caja' })
  rawPurchaseUnit?: string | null;

  @ApiPropertyOptional({ example: 'caja' })
  normalizedUnit?: string | null;

  @ApiProperty({
    example: {
      id: 'sp-uuid-1',
      isPrimarySupplier: true,
      purchaseUnit: { id: 'u-caja-uuid', name: 'Caja', symbol: 'CJA' },
      conversionFactorToBase: '100.0000',
    },
  })
  supplierProduct: {
    id: string;
    isPrimarySupplier: boolean;
    purchaseUnit: {
      id: string;
      name: string;
      symbol: string;
    };
    conversionFactorToBase: string;
  };

  @ApiProperty({ type: ImporterProductReferenceDto })
  product: ImporterProductReferenceDto;
}

export class ImporterUnknownRowDto implements IImporterUnknownRow {
  @ApiProperty({ example: 3 })
  rowNumber: number;

  @ApiProperty({ example: 'PAR-500' })
  rawSku: string;

  @ApiProperty({ example: 'PAR-500' })
  normalizedSku: string;

  @ApiPropertyOptional({ example: 'Paracetamol 500mg' })
  supplierDescription?: string | null;

  @ApiProperty({ example: '890.0000' })
  usualCostNet: string;

  @ApiPropertyOptional({ example: '50' })
  rawQuantity?: string | null;

  @ApiPropertyOptional({ example: '50.0000' })
  quantityCanonical?: string | null;

  @ApiPropertyOptional({ example: 'Frasco' })
  rawPurchaseUnit?: string | null;

  @ApiPropertyOptional({ example: 'frasco' })
  normalizedUnit?: string | null;
}

export class ImporterErrorRowDto implements IImporterErrorRow {
  @ApiProperty({ example: 4 })
  rowNumber: number;

  @ApiPropertyOptional({ example: 'DIP-100' })
  rawSku?: string | null;

  @ApiPropertyOptional({ example: 'DIP-100' })
  normalizedSku?: string | null;

  @ApiPropertyOptional({ example: '-150.00' })
  rawCost?: string | null;

  @ApiPropertyOptional({ example: 'Dipirona 500mg' })
  rawDescription?: string | null;

  @ApiPropertyOptional({ example: '0' })
  rawQuantity?: string | null;

  @ApiPropertyOptional({ example: null })
  rawPurchaseUnit?: string | null;

  @ApiProperty({ type: [ImporterRowErrorDto] })
  errors: ImporterRowErrorDto[];
}

export class ImporterPreviewSummaryDto implements IImporterPreviewSummary {
  @ApiProperty({ example: 10 })
  totalRows: number;

  @ApiProperty({ example: 8 })
  validRows: number;

  @ApiProperty({ example: 1 })
  unknownRows: number;

  @ApiProperty({ example: 1 })
  errorRows: number;

  @ApiProperty({ example: false })
  canContinue: boolean;
}

export class ImporterPreviewResponseDto implements IImporterPreviewResponse {
  @ApiProperty({ type: ImporterSupplierSummaryDto })
  supplier: ImporterSupplierSummaryDto;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  fileChecksum: string;

  @ApiProperty({ example: '9a01f5c3e78b67...' })
  headerFingerprint: string;

  @ApiProperty({ example: '8c4a11f20d5e...' })
  mappingChecksum: string;

  @ApiProperty({ example: '1b99a3c75d4e...' })
  contentChecksum: string;

  @ApiProperty({ type: ImporterPreviewSummaryDto })
  summary: ImporterPreviewSummaryDto;

  @ApiProperty({ type: [ImporterValidRowDto] })
  validRows: ImporterValidRowDto[];

  @ApiProperty({ type: [ImporterUnknownRowDto] })
  unknownRows: ImporterUnknownRowDto[];

  @ApiProperty({ type: [ImporterErrorRowDto] })
  errorRows: ImporterErrorRowDto[];
}

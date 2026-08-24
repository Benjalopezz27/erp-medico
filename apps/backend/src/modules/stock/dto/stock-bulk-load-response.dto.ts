import { ApiProperty } from '@nestjs/swagger';
import {
  StockBulkRowErrorCode,
  StockBulkLoadRowStatus,
  IStockBulkLoadSummary,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadRowProduct,
  IStockBulkLoadRowError,
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
} from '@erp/shared-types';

export class StockBulkLoadRowProductDto implements IStockBulkLoadRowProduct {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'P0001' })
  internalCode: string;

  @ApiProperty({ example: 'Amoxicilina 500mg' })
  name: string;

  @ApiProperty({ example: 10 })
  currentBaseStock: number;

  @ApiProperty({ example: 60 })
  projectedStock: number;

  @ApiProperty({
    example: {
      id: 'u1',
      name: 'Unidad',
      symbol: 'u',
    },
  })
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export class StockBulkLoadRowErrorDto implements IStockBulkLoadRowError {
  @ApiProperty({
    enum: StockBulkRowErrorCode,
    example: StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
  })
  code: StockBulkRowErrorCode;

  @ApiProperty({
    example: 'El producto con código "P9999" no existe en el catálogo.',
  })
  message: string;
}

export class StockBulkLoadValidatedRowDto implements IStockBulkLoadValidatedRow {
  @ApiProperty({ example: 2 })
  rowNumber: number;

  @ApiProperty({ example: 'P0001' })
  internalCode: string;

  @ApiProperty({ example: 50, nullable: true })
  quantityBase: number | null;

  @ApiProperty({
    enum: StockBulkLoadRowStatus,
    example: StockBulkLoadRowStatus.INCLUDED_VALID,
  })
  status: StockBulkLoadRowStatus;

  @ApiProperty({ type: StockBulkLoadRowProductDto, nullable: true })
  product: StockBulkLoadRowProductDto | null;

  @ApiProperty({ type: [StockBulkLoadRowErrorDto] })
  errors: StockBulkLoadRowErrorDto[];
}

export class StockBulkLoadSummaryDto implements IStockBulkLoadSummary {
  @ApiProperty({ example: 10 })
  totalRows: number;

  @ApiProperty({ example: 8 })
  includedRows: number;

  @ApiProperty({ example: 2 })
  skippedRows: number;

  @ApiProperty({ example: 8 })
  validRows: number;

  @ApiProperty({ example: 0 })
  invalidRows: number;

  @ApiProperty({ example: 500.5 })
  totalQuantityBase: number;
}

export class StockBulkLoadPreviewResponseDto implements IStockBulkLoadPreviewResponse {
  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  fileChecksum: string;

  @ApiProperty({
    example: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    nullable: true,
  })
  contentChecksum: string | null;

  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ type: StockBulkLoadSummaryDto })
  summary: StockBulkLoadSummaryDto;

  @ApiProperty({ type: [StockBulkLoadValidatedRowDto] })
  rows: StockBulkLoadValidatedRowDto[];
}

export class StockBulkLoadConfirmResponseDto implements IStockBulkLoadConfirmResponse {
  @ApiProperty({ example: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e' })
  batchId: string;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  fileChecksum: string;

  @ApiProperty({
    example: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
  })
  contentChecksum: string;

  @ApiProperty({ example: 8 })
  rowCount: number;

  @ApiProperty({ example: 8 })
  movementCount: number;

  @ApiProperty({ example: 500.5 })
  totalQuantityBase: number;

  @ApiProperty({ example: '2026-08-24T12:00:00.000Z' })
  confirmedAt: string;
}

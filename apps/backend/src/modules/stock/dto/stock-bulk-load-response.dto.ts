import { ApiProperty } from '@nestjs/swagger';
import {
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
  IStockBulkLoadSummary,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadRowProduct,
  IStockBulkLoadRowError,
  StockBulkRowErrorCode,
} from '@erp/shared-types';

export class StockBulkLoadRowErrorDto implements IStockBulkLoadRowError {
  @ApiProperty({ enum: StockBulkRowErrorCode })
  code: StockBulkRowErrorCode;

  @ApiProperty()
  message: string;
}

export class StockBulkLoadRowProductDto implements IStockBulkLoadRowProduct {
  @ApiProperty()
  id: string;

  @ApiProperty()
  internalCode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  currentBaseStock: number;

  @ApiProperty()
  projectedStock: number;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      symbol: { type: 'string' },
    },
  })
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export class StockBulkLoadValidatedRowDto implements IStockBulkLoadValidatedRow {
  @ApiProperty()
  rowNumber: number;

  @ApiProperty()
  internalCode: string;

  @ApiProperty({ nullable: true })
  quantityBase: number | null;

  @ApiProperty({ type: StockBulkLoadRowProductDto, nullable: true })
  product: StockBulkLoadRowProductDto | null;

  @ApiProperty({ type: [StockBulkLoadRowErrorDto] })
  errors: StockBulkLoadRowErrorDto[];

  @ApiProperty()
  isValid: boolean;
}

export class StockBulkLoadSummaryDto implements IStockBulkLoadSummary {
  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  validRows: number;

  @ApiProperty()
  invalidRows: number;

  @ApiProperty()
  totalQuantityBase: number;
}

export class StockBulkLoadPreviewResponseDto implements IStockBulkLoadPreviewResponse {
  @ApiProperty()
  fileChecksum: string;

  @ApiProperty({ nullable: true })
  contentChecksum: string | null;

  @ApiProperty()
  valid: boolean;

  @ApiProperty({ type: StockBulkLoadSummaryDto })
  summary: StockBulkLoadSummaryDto;

  @ApiProperty({ type: [StockBulkLoadValidatedRowDto] })
  rows: StockBulkLoadValidatedRowDto[];
}

export class StockBulkLoadConfirmResponseDto implements IStockBulkLoadConfirmResponse {
  @ApiProperty()
  batchId: string;

  @ApiProperty()
  fileChecksum: string;

  @ApiProperty()
  contentChecksum: string;

  @ApiProperty()
  rowCount: number;

  @ApiProperty()
  movementCount: number;

  @ApiProperty()
  totalQuantityBase: number;

  @ApiProperty()
  confirmedAt: string;
}

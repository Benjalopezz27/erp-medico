import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductBulkLoadRowStatus,
  ProductBulkRowErrorCode,
  ProductTaxTreatment,
  IProductBulkLoadPreviewResponse,
  IProductBulkLoadConfirmResponse,
  IProductBulkLoadSummary,
  IProductBulkLoadValidatedRow,
  IProductBulkLoadRowProduct,
  IProductBulkLoadRowError,
  IProductBulkConversionDto,
} from '@erp/shared-types';

export class ProductBulkConversionDto implements IProductBulkConversionDto {
  @ApiProperty() presentationUnitId: string;
  @ApiProperty() presentationUnitName: string;
  @ApiProperty() presentationUnitSymbol: string;
  @ApiProperty() conversionFactor: number;
}

export class ProductBulkLoadRowProductDto implements IProductBulkLoadRowProduct {
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() categoryName: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() baseUnitName: string;
  @ApiProperty() baseUnitSymbol: string;
  @ApiProperty() baseUnitId: string;
  @ApiProperty() costNet: number;
  @ApiProperty() activePriceNet: number;
  @ApiProperty() minStock: number;
  @ApiProperty() initialStock: number;
  @ApiPropertyOptional({ nullable: true }) markupPercentage: number | null;
  @ApiProperty() suggestedPriceNet: number;
  @ApiProperty({ enum: ProductTaxTreatment }) taxTreatment: ProductTaxTreatment;
  @ApiPropertyOptional({ nullable: true }) ivaPercentage: number | null;
  @ApiProperty({ type: [ProductBulkConversionDto] })
  conversions: ProductBulkConversionDto[];
}

export class ProductBulkLoadRowErrorDto implements IProductBulkLoadRowError {
  @ApiProperty({ enum: ProductBulkRowErrorCode })
  code: ProductBulkRowErrorCode;

  @ApiPropertyOptional()
  field?: string;

  @ApiProperty()
  message: string;
}

export class ProductBulkLoadValidatedRowDto implements IProductBulkLoadValidatedRow {
  @ApiProperty() rowNumber: number;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ProductBulkLoadRowStatus })
  status: ProductBulkLoadRowStatus;

  @ApiProperty({ type: ProductBulkLoadRowProductDto, nullable: true })
  product: ProductBulkLoadRowProductDto | null;

  @ApiProperty({ type: [ProductBulkLoadRowErrorDto] })
  errors: ProductBulkLoadRowErrorDto[];
}

export class ProductBulkLoadSummaryDto implements IProductBulkLoadSummary {
  @ApiProperty() totalRows: number;
  @ApiProperty() validRows: number;
  @ApiProperty() invalidRows: number;
  @ApiProperty() totalInitialStock: number;
}

export class ProductBulkLoadPreviewResponseDto implements IProductBulkLoadPreviewResponse {
  @ApiProperty() fileChecksum: string;
  @ApiPropertyOptional({ nullable: true }) contentChecksum: string | null;
  @ApiProperty() valid: boolean;
  @ApiProperty({ type: ProductBulkLoadSummaryDto })
  summary: ProductBulkLoadSummaryDto;
  @ApiProperty({ type: [ProductBulkLoadValidatedRowDto] })
  rows: ProductBulkLoadValidatedRowDto[];
}

export class ProductBulkLoadConfirmResponseDto implements IProductBulkLoadConfirmResponse {
  @ApiProperty() batchId: string;
  @ApiProperty() fileChecksum: string;
  @ApiProperty() contentChecksum: string;
  @ApiProperty() rowCount: number;
  @ApiProperty() movementCount: number;
  @ApiProperty() totalQuantityBase: number;
  @ApiProperty() confirmedAt: string;
}

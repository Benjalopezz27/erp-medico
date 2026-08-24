import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus, StockStatus } from '@erp/shared-types';
import {
  StockCategoryResponseDto,
  StockUnitResponseDto,
} from './stock-overview-item-response.dto';

export class StockProductSummaryResponseDto {
  @ApiProperty({
    description: 'Product UUID v4',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Automatic sequential internal code',
    example: 'P0001',
  })
  internalCode: string;

  @ApiProperty({
    description: 'Product commercial name',
    example: 'Suero Fisiológico 1L',
  })
  productName: string;

  @ApiProperty({
    description: 'Product catalog lifecycle status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @ApiProperty({
    description: 'Product category information',
    type: () => StockCategoryResponseDto,
  })
  category: StockCategoryResponseDto;

  @ApiProperty({
    description: 'Product base unit information',
    type: () => StockUnitResponseDto,
  })
  baseUnit: StockUnitResponseDto;

  @ApiProperty({
    description: 'Current consolidated balance in base units',
    example: 45.0,
  })
  currentBaseStock: number;

  @ApiProperty({
    description: 'Configured minimum stock alert threshold in base units',
    example: 100.0,
  })
  minStock: number;

  @ApiProperty({
    description: 'Derived stock health status',
    enum: StockStatus,
    example: StockStatus.LOW,
  })
  stockStatus: StockStatus;
}

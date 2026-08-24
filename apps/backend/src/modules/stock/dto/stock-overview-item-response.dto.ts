import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus, StockStatus } from '@erp/shared-types';

export class StockCategoryResponseDto {
  @ApiProperty({
    description: 'Category UUID v4',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Descartables',
  })
  name: string;
}

export class StockUnitResponseDto {
  @ApiProperty({
    description: 'Base Unit UUID v4',
    example: '223e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Base Unit full name',
    example: 'Unidad',
  })
  name: string;

  @ApiProperty({
    description: 'Base Unit abbreviation symbol',
    example: 'u',
  })
  symbol: string;
}

export class StockOverviewItemResponseDto {
  @ApiProperty({
    description: 'Product UUID v4',
    example: '323e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Automatic sequential internal code',
    example: 'P0001',
  })
  internalCode: string;

  @ApiProperty({
    description: 'Product commercial name',
    example: 'Catéter IV 20G',
  })
  productName: string;

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
    example: 45.5,
  })
  currentBaseStock: number;

  @ApiProperty({
    description: 'Configured minimum stock alert threshold in base units',
    example: 50,
  })
  minStock: number;

  @ApiProperty({
    description: 'Derived stock health status',
    enum: StockStatus,
    example: StockStatus.LOW,
  })
  stockStatus: StockStatus;

  @ApiProperty({
    description: 'Product catalog lifecycle status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  status: ProductStatus;
}

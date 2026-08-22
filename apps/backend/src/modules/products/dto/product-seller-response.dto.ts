import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@erp/shared-types';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { UnitResponseDto } from '../../units/dto/unit-response.dto';
import { ProductUnitConversionResponseDto } from './product-unit-conversion-response.dto';

export class ProductSellerResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the product',
    example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  id: string;

  @ApiProperty({
    description: 'Unique internal code of the product',
    example: 'MED-001',
  })
  internalCode: string;

  @ApiProperty({
    description: 'Commercial name of the product',
    example: 'Ibuprofeno 400mg x 10 comp',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'Analgésico y antiinflamatorio',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'UUID of the category',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  categoryId: string;

  @ApiProperty({
    description: 'UUID of the base unit of measure',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  baseUnitId: string;

  @ApiProperty({
    description: 'Minimum stock alert threshold',
    example: 100,
  })
  minStock: number;

  @ApiProperty({
    description: 'Active net selling price in ARS',
    example: 2025.68,
  })
  activePriceNet: number;

  @ApiProperty({
    description: 'Catalog status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @ApiPropertyOptional({
    description: 'Category details',
    type: () => CategoryResponseDto,
  })
  category?: CategoryResponseDto;

  @ApiPropertyOptional({
    description: 'Base unit details',
    type: () => UnitResponseDto,
  })
  baseUnit?: UnitResponseDto;

  @ApiPropertyOptional({
    description: 'Configured presentation unit conversions',
    type: () => [ProductUnitConversionResponseDto],
  })
  conversions?: ProductUnitConversionResponseDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-08-22T10:00:00.000Z',
  })
  createdAt: Date | string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-08-22T10:00:00.000Z',
  })
  updatedAt: Date | string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  ProductTaxTreatment,
  type IProductSummary,
  type IUnitSummary,
} from '@erp/shared-types';

export class UnitSummaryResponseDto implements IUnitSummary {
  @ApiProperty({
    description: 'Unit UUID',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  id: string;

  @ApiProperty({
    description: 'Unit name',
    example: 'Unidad',
  })
  name: string;

  @ApiProperty({
    description: 'Unit symbol',
    example: 'u',
  })
  symbol: string;
}

export class ProductSummaryResponseDto implements IProductSummary {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id: string;

  @ApiProperty({
    description: 'Sequential internal code',
    example: 'P0001',
  })
  internalCode: string;

  @ApiProperty({
    description: 'Commercial product name',
    example: 'Ibuprofeno 400mg x 10 comp',
  })
  name: string;

  @ApiProperty({
    description: 'Base unit summary',
    type: () => UnitSummaryResponseDto,
  })
  baseUnit: UnitSummaryResponseDto;

  @ApiProperty({
    description: 'Current consolidated ledger stock balance in base units',
    example: 100,
  })
  currentStock: number;

  @ApiProperty({
    description: 'Current active net selling price in ARS',
    example: 1500.5,
  })
  activePriceNet: number;

  @ApiProperty({ enum: ProductTaxTreatment })
  taxTreatment: ProductTaxTreatment;

  @ApiProperty({
    description: 'VAT rate applied on sale',
    example: 21,
    nullable: true,
  })
  ivaPercentage: number | null;
}

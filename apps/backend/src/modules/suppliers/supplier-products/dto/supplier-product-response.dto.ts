import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ISupplierProduct,
  ISupplierProductProductSummary,
  IUnitSummary,
} from '@erp/shared-types';

export class UnitSummaryResponseDto implements IUnitSummary {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Caja' })
  name: string;

  @ApiProperty({ example: 'cj' })
  symbol: string;
}

export class SupplierProductProductSummaryDto implements ISupplierProductProductSummary {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'P0001' })
  internalCode: string;

  @ApiProperty({ example: 'Amoxicilina 500mg' })
  name: string;

  @ApiProperty({ type: UnitSummaryResponseDto })
  baseUnit: UnitSummaryResponseDto;
}

export class SupplierProductResponseDto implements ISupplierProduct {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  supplierId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  productId: string;

  @ApiProperty({ example: 'MED-PROV-99' })
  supplierExternalCode: string;

  @ApiPropertyOptional({
    example: 'Solución Fisiológica 500ml x 10',
    nullable: true,
  })
  supplierDescription?: string | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  purchaseUnitId: string;

  @ApiProperty({ example: 10 })
  conversionFactorToBase: number;

  @ApiPropertyOptional({ example: 1500.5, nullable: true })
  usualCostNet?: number | null;

  @ApiProperty({ example: false })
  isPrimarySupplier: boolean;

  @ApiPropertyOptional({ type: SupplierProductProductSummaryDto })
  product?: SupplierProductProductSummaryDto;

  @ApiPropertyOptional({ type: UnitSummaryResponseDto })
  purchaseUnit?: UnitSummaryResponseDto;

  @ApiProperty({ example: '2026-08-25T12:00:00.000Z' })
  createdAt: Date | string;

  @ApiProperty({ example: '2026-08-25T12:00:00.000Z' })
  updatedAt: Date | string;
}

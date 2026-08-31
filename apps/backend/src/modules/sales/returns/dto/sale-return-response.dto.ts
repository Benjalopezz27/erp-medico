import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductTaxTreatment, SaleReturnItemQuality } from '@erp/shared-types';
import {
  FiscalDocumentResponseDto,
  SalePartyResponseDto,
  SaleProductResponseDto,
} from '../../dto';

export class SaleReturnItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  saleReturnId: string;

  @ApiProperty({ format: 'uuid' })
  saleItemId: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantityBase: number;

  @ApiProperty({ enum: SaleReturnItemQuality })
  quality: SaleReturnItemQuality;

  @ApiProperty({ example: '100.00' })
  unitPriceNet: string;

  @ApiProperty({ enum: ProductTaxTreatment })
  taxTreatment: ProductTaxTreatment;

  @ApiPropertyOptional({ example: '21.00', nullable: true })
  ivaPercentage: string | null;

  @ApiProperty({ example: '200.00' })
  subtotalNet: string;

  @ApiProperty({ example: '42.00' })
  ivaAmount: string;

  @ApiProperty({ example: '242.00' })
  subtotalGross: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  stockMovementId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  quarantineStockId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ type: SaleProductResponseDto })
  product?: SaleProductResponseDto;

  @ApiProperty()
  createdAt: string;
}

export class SaleReturnResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  saleId: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'Mercadería defectuosa' })
  reason: string;

  @ApiProperty({ example: '200.00' })
  taxableNet: string;

  @ApiProperty({ example: '0.00' })
  exemptAmount: string;

  @ApiProperty({ example: '0.00' })
  nonTaxedAmount: string;

  @ApiProperty({ example: '200.00' })
  totalNet: string;

  @ApiProperty({ example: '42.00' })
  ivaTotal: string;

  @ApiProperty({ example: '242.00' })
  totalGross: string;

  @ApiPropertyOptional({ nullable: true })
  idempotencyKey?: string | null;

  @ApiPropertyOptional({ type: FiscalDocumentResponseDto, nullable: true })
  fiscalDocument?: FiscalDocumentResponseDto | null;

  @ApiPropertyOptional({ type: SalePartyResponseDto })
  user?: SalePartyResponseDto;

  @ApiProperty({ type: [SaleReturnItemResponseDto] })
  items: SaleReturnItemResponseDto[];

  @ApiProperty()
  createdAt: string;
}

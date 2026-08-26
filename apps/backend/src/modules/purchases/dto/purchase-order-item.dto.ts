import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'Supplier product association UUID' })
  @IsUUID('4')
  supplierProductId: string;

  @ApiProperty({
    description: 'Quantity ordered in purchase units',
    example: 10.5,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(99999999.9999)
  orderedQty: number;

  @ApiPropertyOptional({
    description:
      'Expected net cost per unit. If omitted, uses SupplierProduct.usualCostNet',
    example: 1250.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(99999999.9999)
  expectedCostUnitNet?: number | null;
}

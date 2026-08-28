import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerPricingRuleApplied,
  IResolvedCustomerPrice,
} from '@erp/shared-types';

export class ResolvedCustomerPriceResponseDto implements IResolvedCustomerPrice {
  @ApiProperty({ format: 'uuid' }) customerId: string;
  @ApiProperty() customerBusinessName: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty({ example: '120.00' }) basePriceNet: string;
  @ApiProperty({ enum: CustomerPricingRuleApplied })
  ruleApplied: CustomerPricingRuleApplied;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) ruleId:
    string | null;
  @ApiPropertyOptional({ example: '10.0000', nullable: true })
  discountPercentage: string | null;
  @ApiPropertyOptional({ example: '12.00', nullable: true })
  discountAmountNet: string | null;
  @ApiProperty({ example: '108.00' }) finalPriceNet: string;
}

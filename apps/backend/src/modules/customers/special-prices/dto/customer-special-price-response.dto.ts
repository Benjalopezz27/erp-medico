import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerSpecialPriceMode,
  ICustomerSpecialPrice,
  ICustomerSpecialPricePaginationMeta,
  IPaginatedCustomerSpecialPricesResponse,
} from '@erp/shared-types';

export class CustomerSpecialPriceResponseDto implements ICustomerSpecialPrice {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) customerId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty({ example: '120.00' }) activeCatalogPriceNet: string;
  @ApiProperty({ enum: CustomerSpecialPriceMode })
  mode: CustomerSpecialPriceMode;
  @ApiPropertyOptional({ example: '100.00', nullable: true })
  specialPriceNet: string | null;
  @ApiPropertyOptional({ example: '10.0000', nullable: true })
  discountPercentage: string | null;
  @ApiProperty({ example: '100.00' }) finalPriceNet: string;
  @ApiProperty({ minimum: 1 }) version: number;
  @ApiProperty({ format: 'date-time' }) createdAt: Date | string;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date | string;
}

export class CustomerSpecialPricePaginationMetaDto implements ICustomerSpecialPricePaginationMeta {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedCustomerSpecialPricesResponseDto implements IPaginatedCustomerSpecialPricesResponse {
  @ApiProperty({ type: [CustomerSpecialPriceResponseDto] })
  data: CustomerSpecialPriceResponseDto[];
  @ApiProperty({ type: CustomerSpecialPricePaginationMetaDto })
  meta: CustomerSpecialPricePaginationMetaDto;
}

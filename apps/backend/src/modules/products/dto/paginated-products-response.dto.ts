import { ApiProperty } from '@nestjs/swagger';
import { ProductAdminResponseDto } from './product-admin-response.dto';
import { ProductSellerResponseDto } from './product-seller-response.dto';

export class PaginatedProductsAdminResponseDto {
  @ApiProperty({
    description: 'Array of products for administrator view',
    type: () => [ProductAdminResponseDto],
  })
  items: ProductAdminResponseDto[];

  @ApiProperty({
    description: 'Total number of items matching the query',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Pagination offset',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: 'Pagination limit',
    example: 10,
  })
  limit: number;
}

export class PaginatedProductsSellerResponseDto {
  @ApiProperty({
    description: 'Array of products for seller view',
    type: () => [ProductSellerResponseDto],
  })
  items: ProductSellerResponseDto[];

  @ApiProperty({
    description: 'Total number of items matching the query',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Pagination offset',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: 'Pagination limit',
    example: 10,
  })
  limit: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { StockOverviewItemResponseDto } from './stock-overview-item-response.dto';

export class StockPaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items matching the query filter',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Indicates whether a next page exists',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Indicates whether a previous page exists',
    example: false,
  })
  hasPreviousPage: boolean;
}

export class PaginatedStockResponseDto {
  @ApiProperty({
    description: 'List of product stock overview items',
    type: () => [StockOverviewItemResponseDto],
  })
  items: StockOverviewItemResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => StockPaginationMetaDto,
  })
  meta: StockPaginationMetaDto;
}

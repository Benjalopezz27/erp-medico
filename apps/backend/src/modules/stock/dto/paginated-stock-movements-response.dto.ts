import { ApiProperty } from '@nestjs/swagger';
import { StockProductSummaryResponseDto } from './stock-product-summary-response.dto';
import { StockMovementItemResponseDto } from './stock-movement-item-response.dto';
import { StockPaginationMetaDto } from './paginated-stock-response.dto';

export class PaginatedStockMovementsResponseDto {
  @ApiProperty({
    description: 'Product summary information for header display',
    type: () => StockProductSummaryResponseDto,
  })
  product: StockProductSummaryResponseDto;

  @ApiProperty({
    description: 'Paginated list of immutable ledger movement entries',
    type: () => [StockMovementItemResponseDto],
  })
  items: StockMovementItemResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => StockPaginationMetaDto,
  })
  meta: StockPaginationMetaDto;
}

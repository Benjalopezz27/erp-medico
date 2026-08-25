import { ApiProperty } from '@nestjs/swagger';
import { QuarantineStockResponseDto } from './quarantine-response.dto';
import { StockPaginationMetaDto } from '../../stock/dto/paginated-stock-response.dto';

export class PaginatedQuarantineResponseDto {
  @ApiProperty({
    description: 'List of quarantine stock items',
    type: () => [QuarantineStockResponseDto],
  })
  items: QuarantineStockResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: () => StockPaginationMetaDto,
  })
  meta: StockPaginationMetaDto;
}

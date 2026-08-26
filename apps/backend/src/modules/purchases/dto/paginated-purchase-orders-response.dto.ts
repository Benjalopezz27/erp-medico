import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderSummaryResponseDto } from './purchase-order-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}

export class PaginatedPurchaseOrdersResponseDto {
  @ApiProperty({ type: [PurchaseOrderSummaryResponseDto] })
  data: PurchaseOrderSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

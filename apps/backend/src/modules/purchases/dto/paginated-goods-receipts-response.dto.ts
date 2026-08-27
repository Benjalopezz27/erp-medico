import { ApiProperty } from '@nestjs/swagger';
import { GoodsReceiptResponseDto } from './goods-receipt-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}

export class PaginatedGoodsReceiptsResponseDto {
  @ApiProperty({
    type: [GoodsReceiptResponseDto],
    description: 'Listado de recepciones registradas para la orden de compra',
  })
  data: GoodsReceiptResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Metadatos de paginación',
  })
  meta: PaginationMetaDto;
}

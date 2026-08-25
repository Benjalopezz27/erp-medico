import { ApiProperty } from '@nestjs/swagger';
import { SupplierResponseDto } from './supplier-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 45, description: 'Total de registros encontrados' })
  total: number;

  @ApiProperty({ example: 1, description: 'Página actual' })
  page: number;

  @ApiProperty({ example: 10, description: 'Límite de registros por página' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: 'Indica si existe una página siguiente',
  })
  hasNextPage: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si existe una página previa',
  })
  hasPreviousPage: boolean;
}

export class PaginatedSuppliersResponseDto {
  @ApiProperty({
    type: [SupplierResponseDto],
    description: 'Listado de proveedores en la página actual',
  })
  data: SupplierResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Metadatos de paginación',
  })
  meta: PaginationMetaDto;
}

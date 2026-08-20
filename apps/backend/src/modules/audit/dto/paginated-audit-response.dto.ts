import { ApiProperty } from '@nestjs/swagger';
import { AuditLogResponseDto } from './audit-log-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of matching records' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of available pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Indicates whether a subsequent page exists' })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Indicates whether a previous page exists' })
  hasPreviousPage!: boolean;
}

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({
    description: 'List of audit records on current page',
    type: [AuditLogResponseDto],
  })
  data!: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}

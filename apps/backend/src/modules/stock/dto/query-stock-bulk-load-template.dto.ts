import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryStockBulkLoadTemplateDto {
  @ApiPropertyOptional({
    description: 'Format of the template file to download (xlsx or csv)',
    enum: ['xlsx', 'csv'],
    default: 'xlsx',
  })
  @IsOptional()
  @IsIn(['xlsx', 'csv'], {
    message: 'El formato de plantilla debe ser xlsx o csv.',
  })
  format?: 'xlsx' | 'csv' = 'xlsx';
}

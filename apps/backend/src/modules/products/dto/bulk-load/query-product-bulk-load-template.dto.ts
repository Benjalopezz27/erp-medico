import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class QueryProductBulkLoadTemplateDto {
  @ApiPropertyOptional({
    description: 'File format of the template',
    enum: ['xlsx', 'csv'],
    default: 'xlsx',
  })
  @IsOptional()
  @IsIn(['xlsx', 'csv'], {
    message: 'El formato de la plantilla debe ser "xlsx" o "csv".',
  })
  format?: 'xlsx' | 'csv' = 'xlsx';
}

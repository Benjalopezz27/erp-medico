import {
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierImportMappingDto } from './supplier-import-mapping.dto';
import { IUpdateSupplierImportTemplatePayload } from '@erp/shared-types';

export class UpdateSupplierImportTemplateDto implements IUpdateSupplierImportTemplatePayload {
  @ApiPropertyOptional({
    example: 'Lista de Precios 3M v2',
    description: 'Nuevo nombre para la plantilla',
  })
  @IsOptional()
  @IsString({
    message: 'El nombre de la plantilla debe ser una cadena de texto.',
  })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    type: SupplierImportMappingDto,
    description: 'Nueva configuración de mapeo de columnas',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierImportMappingDto)
  mapping?: SupplierImportMappingDto;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { QuarantineStatus } from '@erp/shared-types';

export class QueryQuarantineDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser mayor o igual a 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite debe ser al menos 1.' })
  @Max(100, { message: 'El límite no puede ser mayor a 100.' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by specific product UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido.' })
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product name or internal code',
    example: 'Amoxicilina',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by quarantine status',
    enum: QuarantineStatus,
    example: QuarantineStatus.EN_CUARENTENA,
  })
  @IsOptional()
  @IsEnum(QuarantineStatus, {
    message:
      'El estado debe ser EN_CUARENTENA, MERMA_CONFIRMADA, DEVOLUCION_PROVEEDOR o REINGRESADO_STOCK.',
  })
  status?: QuarantineStatus;
}

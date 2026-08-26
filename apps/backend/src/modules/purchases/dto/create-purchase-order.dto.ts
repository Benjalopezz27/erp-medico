import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderItemDto } from './purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Supplier UUID' })
  @IsUUID('4')
  supplierId: string;

  @ApiPropertyOptional({
    description: 'Expected delivery date (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'expectedDeliveryDate must be in YYYY-MM-DD format',
  })
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional({
    description: 'Notes or internal remarks',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiProperty({ description: 'Order items', type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelPurchaseOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cancelReason?: string | null;
}

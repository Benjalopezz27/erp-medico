import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectCheckDto {
  @ApiPropertyOptional({ maxLength: 500, example: 'Sin fondos' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

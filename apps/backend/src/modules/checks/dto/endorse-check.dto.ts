import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EndorseCheckDto {
  @ApiProperty({ description: 'Proveedor al que se endosa el cheque' })
  @IsUUID()
  supplierId: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const AMOUNT_MESSAGE =
  'El monto debe ser un decimal no negativo con hasta 2 decimales.';

export class OpenCashRegisterDto {
  @ApiProperty({ example: '1000.00' })
  @IsString()
  @Matches(AMOUNT, { message: AMOUNT_MESSAGE })
  openingBalance: string;
}

export class CloseCashRegisterDto {
  @ApiProperty({ example: '1050.00' })
  @IsString()
  @Matches(AMOUNT, { message: AMOUNT_MESSAGE })
  actualBalance: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  observation?: string;
}

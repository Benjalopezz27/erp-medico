import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MONEY = /^\d+(\.\d{1,2})?$/;
const MONEY_MESSAGE = 'debe ser un importe positivo con hasta 2 decimales';

export class PaymentAllocationInputDto {
  @ApiProperty()
  @IsUUID()
  accountReceivableId: string;

  @ApiProperty({ example: '100.00' })
  @Matches(MONEY, { message: `amount ${MONEY_MESSAGE}` })
  amount: string;
}

export class RegisterPaymentDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: [PaymentMethod.EFECTIVO, PaymentMethod.TRANSFERENCIA] })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ enum: PaymentAllocationType })
  @IsEnum(PaymentAllocationType)
  mode: PaymentAllocationType;

  @ApiPropertyOptional({ type: [PaymentAllocationInputDto] })
  @ValidateIf(
    (o: RegisterPaymentDto) => o.mode === PaymentAllocationType.DIRECTED,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationInputDto)
  allocations?: PaymentAllocationInputDto[];

  @ApiPropertyOptional({ example: '250.00' })
  @ValidateIf(
    (o: RegisterPaymentDto) => o.mode === PaymentAllocationType.GLOBAL_AGE,
  )
  @Matches(MONEY, { message: `totalAmount ${MONEY_MESSAGE}` })
  totalAmount?: string;
}

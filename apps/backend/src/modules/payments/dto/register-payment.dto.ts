import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
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

export class CheckInputDto {
  @ApiProperty({ maxLength: 100, example: 'Galicia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({ maxLength: 30, example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  checkNumber: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  drawerName: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString({ strict: true })
  dueDate: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  issueDate?: string;
}

export class RegisterPaymentDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({
    enum: [
      PaymentMethod.EFECTIVO,
      PaymentMethod.TRANSFERENCIA,
      PaymentMethod.CHEQUE,
    ],
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    type: CheckInputDto,
    description: 'Obligatorio si y solo si paymentMethod es CHEQUE',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckInputDto)
  check?: CheckInputDto;

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

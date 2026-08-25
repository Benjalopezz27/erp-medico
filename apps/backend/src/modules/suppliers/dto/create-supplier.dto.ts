import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxCondition } from '@erp/shared-types';
import { IsValidCuit } from '../validators/is-cuit.validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'Droguería del Sol S.A.',
    description: 'Razón social del proveedor',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(200, {
    message: 'La razón social no puede superar los 200 caracteres',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  businessName: string;

  @ApiProperty({
    example: '30-50001091-2',
    description: 'CUIT del proveedor con o sin guiones (11 dígitos canónicos)',
  })
  @IsString()
  @IsNotEmpty({ message: 'El CUIT es obligatorio' })
  @IsValidCuit()
  cuit: string;

  @ApiProperty({
    enum: TaxCondition,
    example: TaxCondition.RESPONSABLE_INSCRIPTO,
    description: 'Condición fiscal ante ARCA',
  })
  @IsEnum(TaxCondition, {
    message: 'La condición fiscal debe ser una de las admitidas por el sistema',
  })
  taxCondition: TaxCondition;

  @ApiPropertyOptional({
    example: 'contacto@drogueriadelsol.com',
    description: 'Correo electrónico de contacto',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @MaxLength(255)
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim() !== ''
      ? value.trim().toLowerCase()
      : null,
  )
  email?: string | null;

  @ApiPropertyOptional({
    example: '0351-4890123',
    description: 'Teléfono fijo o comercial',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : null,
  )
  phone?: string | null;

  @ApiPropertyOptional({
    example: '5493514890123',
    description:
      'Número de WhatsApp en formato internacional (10 a 15 dígitos)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?[0-9]{10,15})?$/, {
    message:
      'El número de WhatsApp debe contener entre 10 y 15 dígitos en formato internacional',
  })
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim() !== ''
      ? value.replace(/\D/g, '')
      : null,
  )
  whatsapp?: string | null;

  @ApiPropertyOptional({
    example: 'Av. Colón 1234, Córdoba',
    description: 'Dirección física o fiscal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : null,
  )
  address?: string | null;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ISupplier, TaxCondition } from '@erp/shared-types';

export class SupplierResponseDto implements ISupplier {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Identificador único del proveedor (UUIDv4)',
  })
  id: string;

  @ApiProperty({
    example: 'Droguería del Sol S.A.',
    description: 'Razón social del proveedor',
  })
  businessName: string;

  @ApiProperty({
    example: '30500010912',
    description: 'CUIT canónico de 11 dígitos',
  })
  cuit: string;

  @ApiProperty({
    enum: TaxCondition,
    example: TaxCondition.RESPONSABLE_INSCRIPTO,
    description: 'Condición fiscal ante ARCA',
  })
  taxCondition: TaxCondition;

  @ApiPropertyOptional({
    example: 'contacto@drogueriadelsol.com',
    description: 'Correo electrónico de contacto',
  })
  email?: string | null;

  @ApiPropertyOptional({
    example: '0351-4890123',
    description: 'Teléfono fijo o comercial',
  })
  phone?: string | null;

  @ApiPropertyOptional({
    example: '5493514890123',
    description: 'WhatsApp en formato internacional',
  })
  whatsapp?: string | null;

  @ApiPropertyOptional({
    example: 'Av. Colón 1234, Córdoba',
    description: 'Dirección física o fiscal',
  })
  address?: string | null;

  @ApiProperty({
    example: true,
    description: 'Estado activo o inactivo',
  })
  isActive: boolean;

  @ApiProperty({
    example: '2026-08-25T10:00:00.000Z',
    description: 'Fecha y hora de creación',
  })
  createdAt: Date | string;

  @ApiProperty({
    example: '2026-08-25T10:00:00.000Z',
    description: 'Fecha y hora de última actualización',
  })
  updatedAt: Date | string;
}

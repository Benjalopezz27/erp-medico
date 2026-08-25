import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QuarantineStatus,
  IQuarantineStock,
  IQuarantineStockProduct,
  IQuarantineStockActor,
} from '@erp/shared-types';

export class QuarantineProductSummaryResponseDto
  implements IQuarantineStockProduct
{
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'MED-0001' })
  internalCode: string;

  @ApiProperty({ example: 'Amoxicilina 500mg' })
  name: string;

  @ApiProperty({
    example: {
      id: 'u1-uuid',
      name: 'Comprimido',
      symbol: 'cmp',
    },
  })
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export class QuarantineActorResponseDto implements IQuarantineStockActor {
  @ApiProperty({ example: 'u0-uuid' })
  id: string;

  @ApiProperty({ example: 'Admin User' })
  name: string;

  @ApiProperty({ example: 'admin@erp.com' })
  email: string;
}

export class QuarantineStockResponseDto implements IQuarantineStock {
  @ApiProperty({ example: 'q0-uuid' })
  id: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  productId: string;

  @ApiProperty({ type: () => QuarantineProductSummaryResponseDto })
  product: QuarantineProductSummaryResponseDto;

  @ApiProperty({ example: 10.5 })
  quantityBase: number;

  @ApiProperty({ example: 'Cajas húmedas detectadas en recepción' })
  reason: string;

  @ApiProperty({
    enum: QuarantineStatus,
    example: QuarantineStatus.EN_CUARENTENA,
  })
  status: QuarantineStatus;

  @ApiProperty({ example: 'u0-uuid' })
  entryActorId: string;

  @ApiProperty({ type: () => QuarantineActorResponseDto })
  entryActor: QuarantineActorResponseDto;

  @ApiProperty({ example: 'mov-1-uuid' })
  entryMovementId: string;

  @ApiPropertyOptional({ example: 'u1-uuid', nullable: true })
  resolvedByActorId?: string | null;

  @ApiPropertyOptional({
    type: () => QuarantineActorResponseDto,
    nullable: true,
  })
  resolvedByActor?: QuarantineActorResponseDto | null;

  @ApiPropertyOptional({
    example: 'Mercadería apta para venta',
    nullable: true,
  })
  resolutionNotes?: string | null;

  @ApiPropertyOptional({ example: 'mov-2-uuid', nullable: true })
  resolutionMovementId?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-24T12:00:00.000Z',
    nullable: true,
  })
  resolvedAt?: Date | string | null;

  @ApiProperty({ example: '2026-08-24T10:00:00.000Z' })
  createdAt: Date | string;

  @ApiProperty({ example: '2026-08-24T12:00:00.000Z' })
  updatedAt: Date | string;
}

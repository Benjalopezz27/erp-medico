import { ApiProperty } from '@nestjs/swagger';

export class UnitResponseDto {
  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Unidad' })
  name!: string;

  @ApiProperty({ example: 'u' })
  symbol!: string;

  @ApiProperty({ example: '2026-08-21T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-21T10:00:00.000Z' })
  updatedAt!: Date;
}

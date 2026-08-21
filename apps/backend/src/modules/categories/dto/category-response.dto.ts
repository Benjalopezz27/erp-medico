import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Analgésicos' })
  name!: string;

  @ApiPropertyOptional({ example: 'Medicamentos analgésicos', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '2026-08-21T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-21T10:00:00.000Z' })
  updatedAt!: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitResponseDto } from '../../units/dto/unit-response.dto';

export class ProductUnitConversionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the conversion rule',
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  id: string;

  @ApiProperty({
    description: 'UUID of the associated product',
    example: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  })
  productId: string;

  @ApiProperty({
    description: 'UUID of the presentation unit',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  presentationUnitId: string;

  @ApiProperty({
    description: 'Conversion factor to base unit',
    example: 24.0,
  })
  conversionFactor: number;

  @ApiPropertyOptional({
    description: 'Presentation unit details',
    type: () => UnitResponseDto,
  })
  presentationUnit?: UnitResponseDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-08-22T10:00:00.000Z',
  })
  createdAt: Date | string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-08-22T10:00:00.000Z',
  })
  updatedAt: Date | string;
}

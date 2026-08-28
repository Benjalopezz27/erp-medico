import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerDocumentType,
  ICustomer,
  IPaginatedCustomersResponse,
  TaxCondition,
} from '@erp/shared-types';

export class CustomerResponseDto implements ICustomer {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty({ enum: CustomerDocumentType })
  documentType: CustomerDocumentType;

  @ApiProperty({ description: 'Documento canónico sin separadores' })
  cuitOrDni: string;

  @ApiProperty({ enum: TaxCondition })
  taxCondition: TaxCondition;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiProperty({ example: '0.00', description: 'Decimal canónico' })
  creditLimit: string;

  @ApiProperty({
    example: '0.0000',
    description: 'Porcentaje decimal canónico',
  })
  generalDiscountPercentage: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date | string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date | string;
}

export class CustomerPaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedCustomersResponseDto implements IPaginatedCustomersResponse {
  @ApiProperty({ type: [CustomerResponseDto] })
  data: CustomerResponseDto[];

  @ApiProperty({ type: CustomerPaginationMetaDto })
  meta: CustomerPaginationMetaDto;
}

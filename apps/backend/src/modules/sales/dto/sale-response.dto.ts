import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountReceivableStatus,
  ArcaStatus,
  CustomerPricingRuleApplied,
  FiscalDocumentType,
  PaymentMethod,
  SaleStatus,
} from '@erp/shared-types';

export class SalePartyResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class SaleCustomerResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() businessName: string;
}

export class SaleProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() internalCode: string;
  @ApiProperty() name: string;
}

export class SaleItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) saleId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() itemIndex: number;
  @ApiProperty() quantityBase: number;
  @ApiProperty() catalogPriceNet: string;
  @ApiProperty({ enum: CustomerPricingRuleApplied })
  pricingRuleApplied: CustomerPricingRuleApplied;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  pricingRuleId: string | null;
  @ApiPropertyOptional({ nullable: true }) discountPercentage: string | null;
  @ApiProperty() discountAmountNet: string;
  @ApiProperty() unitPriceNet: string;
  @ApiProperty() subtotalNet: string;
  @ApiProperty() ivaPercentage: string;
  @ApiProperty() ivaAmount: string;
  @ApiProperty() subtotalGross: string;
  @ApiProperty({ type: SaleProductResponseDto })
  product: SaleProductResponseDto;
}

export class FiscalDocumentResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) saleId: string;
  @ApiPropertyOptional({ enum: FiscalDocumentType, nullable: true })
  documentType: FiscalDocumentType | null;
  @ApiPropertyOptional({ nullable: true }) pointOfSale: number | null;
  @ApiPropertyOptional({ nullable: true }) documentNumber: number | null;
  @ApiProperty({ enum: ArcaStatus }) arcaStatus: ArcaStatus;
  @ApiPropertyOptional({ nullable: true }) cae: string | null;
}

export class AccountReceivableResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) customerId: string;
  @ApiProperty({ format: 'uuid' }) saleId: string;
  @ApiProperty({ format: 'uuid' }) fiscalDocumentId: string;
  @ApiProperty() documentReference: string;
  @ApiProperty() originalAmount: string;
  @ApiProperty() currentBalance: string;
  @ApiProperty({ enum: AccountReceivableStatus })
  status: AccountReceivableStatus;
  @ApiPropertyOptional({ nullable: true }) dueDate: string | null;
}

export class SaleResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() saleNumber: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) customerId:
    string | null;
  @ApiProperty({ enum: SaleStatus }) status: SaleStatus;
  @ApiProperty() isCreditSale: boolean;
  @ApiProperty() requiresFiscalInvoice: boolean;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiProperty() totalNet: string;
  @ApiProperty() ivaTotal: string;
  @ApiProperty() totalGross: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiPropertyOptional({ type: SaleCustomerResponseDto, nullable: true })
  customer: SaleCustomerResponseDto | null;
  @ApiProperty({ type: SalePartyResponseDto }) user: SalePartyResponseDto;
  @ApiProperty({ type: [SaleItemResponseDto] }) items: SaleItemResponseDto[];
  @ApiPropertyOptional({ type: FiscalDocumentResponseDto, nullable: true })
  fiscalDocument: FiscalDocumentResponseDto | null;
  @ApiPropertyOptional({ type: AccountReceivableResponseDto, nullable: true })
  accountReceivable: AccountReceivableResponseDto | null;
  @ApiProperty() createdAt: Date | string;
  @ApiProperty() updatedAt: Date | string;
}

export class SalesPaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedSalesResponseDto {
  @ApiProperty({ type: [SaleResponseDto] }) data: SaleResponseDto[];
  @ApiProperty({ type: SalesPaginationMetaDto }) meta: SalesPaginationMetaDto;
}

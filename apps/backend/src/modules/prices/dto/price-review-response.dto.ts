import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MarkupLevel,
  PriceReviewDecisionAction,
  PriceReviewStaleReason,
  PriceReviewStatus,
} from '@erp/shared-types';

class PriceReviewActorResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}

class PriceReviewProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ format: 'uuid' }) categoryId: string;
  @ApiProperty() categoryName: string;
  @ApiProperty({ example: '100.0000' }) costNet: string;
  @ApiProperty({ example: '125.00' }) suggestedPriceNet: string;
  @ApiProperty({ example: '120.00' }) activePriceNet: string;
}

class PriceReviewOriginResponseDto {
  @ApiProperty({ format: 'uuid' }) supplierInvoiceId: string;
  @ApiProperty() invoiceNumber: string;
  @ApiProperty({ format: 'date' }) invoiceDate: string;
  @ApiProperty({ format: 'uuid' }) supplierId: string;
  @ApiProperty() supplierName: string;
}

export class PriceReviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) supplierInvoiceId: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty() productCode: string;
  @ApiProperty() productName: string;
  @ApiProperty() previousCostNet: string;
  @ApiProperty() newCostNet: string;
  @ApiPropertyOptional({ nullable: true }) markupPercentageSnapshot:
    string | null;
  @ApiPropertyOptional({ enum: MarkupLevel, nullable: true })
  effectiveMarkupLevel: MarkupLevel | null;
  @ApiPropertyOptional({ nullable: true })
  effectiveMarkupConfigurationId: string | null;
  @ApiPropertyOptional({ nullable: true }) effectiveMarkupTargetId:
    string | null;
  @ApiPropertyOptional({ nullable: true }) effectiveMarkupTargetName:
    string | null;
  @ApiProperty() previousSuggestedPriceNet: string;
  @ApiProperty() suggestedPriceNet: string;
  @ApiProperty() activePriceNetSnapshot: string;
  @ApiPropertyOptional({ nullable: true }) approvedPriceNet: string | null;
  @ApiProperty({ enum: PriceReviewStatus }) status: PriceReviewStatus;
  @ApiPropertyOptional({ enum: PriceReviewDecisionAction, nullable: true })
  decisionAction: PriceReviewDecisionAction | null;
  @ApiPropertyOptional({ nullable: true }) decisionReason: string | null;
  @ApiPropertyOptional({ nullable: true }) reviewedByUserId: string | null;
  @ApiPropertyOptional({ nullable: true }) reviewedAt: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: PriceReviewProductResponseDto })
  product: PriceReviewProductResponseDto;
  @ApiProperty({ type: PriceReviewOriginResponseDto })
  origin: PriceReviewOriginResponseDto;
  @ApiPropertyOptional({ type: PriceReviewActorResponseDto, nullable: true })
  reviewedBy: PriceReviewActorResponseDto | null;
  @ApiProperty() isStale: boolean;
  @ApiProperty({ enum: PriceReviewStaleReason, isArray: true })
  staleReasons: PriceReviewStaleReason[];
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  supersededByReviewId: string | null;
  @ApiProperty({ enum: PriceReviewDecisionAction, isArray: true })
  allowedActions: PriceReviewDecisionAction[];
}

class PriceReviewPaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedPriceReviewsResponseDto {
  @ApiProperty({ type: [PriceReviewResponseDto] })
  data: PriceReviewResponseDto[];
  @ApiProperty({ type: PriceReviewPaginationMetaDto })
  meta: PriceReviewPaginationMetaDto;
}

export class PriceReviewPendingCountResponseDto {
  @ApiProperty({ example: 3 }) count: number;
}

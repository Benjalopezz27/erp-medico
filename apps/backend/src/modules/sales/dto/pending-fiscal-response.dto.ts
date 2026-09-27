import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArcaStatus,
  FiscalDocumentType,
  FiscalErrorCode,
  FiscalFailureStage,
} from '@erp/shared-types';
import { SalesPaginationMetaDto } from './sale-response.dto';

export class PendingFiscalDocumentResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) saleId: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) saleReturnId:
    string | null;
  @ApiPropertyOptional({ enum: FiscalDocumentType, nullable: true })
  documentType: FiscalDocumentType | null;
  @ApiPropertyOptional({ nullable: true }) pointOfSale: number | null;
  @ApiPropertyOptional({ nullable: true }) documentNumber: number | null;
  @ApiProperty({ enum: ArcaStatus }) arcaStatus: ArcaStatus;
  @ApiProperty() attemptCount: number;
  @ApiPropertyOptional({ nullable: true }) lastAttemptAt: Date | string | null;
  @ApiPropertyOptional({ nullable: true }) nextAttemptAt: Date | string | null;
  @ApiPropertyOptional({ enum: FiscalFailureStage, nullable: true })
  failureStage: FiscalFailureStage | null;
  @ApiPropertyOptional({ enum: FiscalErrorCode, nullable: true })
  arcaErrorCode: FiscalErrorCode | null;
  @ApiPropertyOptional({ nullable: true }) arcaErrorMessage: string | null;
  @ApiProperty() createdAt: Date | string;
  @ApiProperty() updatedAt: Date | string;
}

export class PaginatedPendingFiscalResponseDto {
  @ApiProperty({ type: [PendingFiscalDocumentResponseDto] })
  data: PendingFiscalDocumentResponseDto[];
  @ApiProperty({ type: SalesPaginationMetaDto }) meta: SalesPaginationMetaDto;
}

export class PendingFiscalCountResponseDto {
  @ApiProperty() pendingCount: number;
  @ApiProperty() rejectedCount: number;
}

export class RetryFiscalDocumentResponseDto {
  @ApiProperty() jobId: string;
  @ApiProperty({
    description: 'false cuando ya había un job en curso para este documento.',
  })
  created: boolean;
}

export class FiscalQueueMetricsResponseDto {
  @ApiProperty() waiting: number;
  @ApiProperty() active: number;
  @ApiProperty() delayed: number;
  @ApiProperty() failed: number;
  @ApiProperty() pendingCount: number;
  @ApiProperty() rejectedCount: number;
  @ApiPropertyOptional({ nullable: true })
  oldestPendingAgeSeconds: number | null;
}

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
  @ApiProperty() saleNumber: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) saleReturnId:
    string | null;
  @ApiProperty() customerName: string;
  @ApiProperty() amount: string;
  @ApiPropertyOptional({ enum: FiscalDocumentType, nullable: true })
  documentType: FiscalDocumentType | null;
  @ApiPropertyOptional({ nullable: true }) pointOfSale: number | null;
  @ApiPropertyOptional({ nullable: true }) documentNumber: number | null;
  @ApiProperty({ enum: ArcaStatus }) arcaStatus: ArcaStatus;
  @ApiProperty() attemptCount: number;
  @ApiPropertyOptional({ nullable: true }) lastAttemptAt: Date | string | null;
  @ApiPropertyOptional({ nullable: true }) nextRetryAt: Date | string | null;
  @ApiPropertyOptional({ enum: FiscalFailureStage, nullable: true })
  failureStage: FiscalFailureStage | null;
  @ApiPropertyOptional({ enum: FiscalErrorCode, nullable: true })
  arcaErrorCode: FiscalErrorCode | null;
  @ApiPropertyOptional({ nullable: true }) arcaErrorMessage: string | null;
  @ApiProperty({
    description:
      'true si ya existe un job wsfe-emit en curso (waiting/active/delayed).',
  })
  hasActiveRetryJob: boolean;
  @ApiProperty() isRetryable: boolean;
  @ApiProperty() createdAt: Date | string;
  @ApiProperty() updatedAt: Date | string;
}

export class PaginatedPendingFiscalResponseDto {
  @ApiProperty({ type: [PendingFiscalDocumentResponseDto] })
  data: PendingFiscalDocumentResponseDto[];
  @ApiProperty({ type: SalesPaginationMetaDto }) meta: SalesPaginationMetaDto;
}

export class PendingFiscalCountResponseDto {
  @ApiProperty() pending: number;
  @ApiProperty() rejected: number;
  @ApiProperty() total: number;
}

export class RetryFiscalDocumentResponseDto {
  @ApiProperty({ format: 'uuid' }) fiscalDocumentId: string;
  @ApiProperty({ enum: ArcaStatus }) arcaStatus: ArcaStatus;
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

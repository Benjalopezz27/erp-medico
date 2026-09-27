import type { ArcaStatus, FiscalDocumentType } from '@erp/shared-types';

export type FiscalAlertTab = 'PENDIENTE_FACTURACION' | 'RECHAZADO';

export interface IFiscalAlertRow {
  id: string;
  documentType: FiscalDocumentType;
  arcaStatus: ArcaStatus;
  saleId: string;
  saleNumber: string;
  saleReturnId: string | null;
  customerName: string;
  amount: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  arcaErrorMessage: string | null;
  hasActiveRetryJob: boolean;
  isRetryable: boolean;
  createdAt: string;
}

export interface IFiscalAlertsSearchParams {
  tab: FiscalAlertTab;
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  documentType?: FiscalDocumentType;
  search?: string;
}

export interface IFiscalAlertsPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedFiscalAlertsResponse {
  data: IFiscalAlertRow[];
  meta: IFiscalAlertsPaginationMeta;
}

export interface IFiscalAlertsCount {
  pending: number;
  rejected: number;
  total: number;
}

export enum FiscalRetryErrorCode {
  FISCAL_DOCUMENT_NOT_FOUND = 'FISCAL_DOCUMENT_NOT_FOUND',
  FISCAL_DOCUMENT_ALREADY_ISSUED = 'FISCAL_DOCUMENT_ALREADY_ISSUED',
  FISCAL_RETRY_JOB_ACTIVE = 'FISCAL_RETRY_JOB_ACTIVE',
  FISCAL_DOCUMENT_NOT_RETRYABLE = 'FISCAL_DOCUMENT_NOT_RETRYABLE',
  FISCAL_CONFIGURATION_PENDING = 'FISCAL_CONFIGURATION_PENDING',
}

export interface IFiscalRetryResult {
  fiscalDocumentId: string;
  arcaStatus: ArcaStatus;
  jobId?: string | null;
}

export interface ParsedFiscalRetryError {
  status?: number;
  code?: FiscalRetryErrorCode | string;
  message: string;
  requiresReconciliation: boolean;
}

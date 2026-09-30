import { ArcaStatus, FiscalDocumentType } from '@erp/shared-types';
import type {
  IFiscalAlertRow,
  IFiscalAlertsCount,
  IPaginatedFiscalAlertsResponse,
} from '../types/fiscal-alerts.types';

export function buildFiscalAlertRow(overrides?: Partial<IFiscalAlertRow>): IFiscalAlertRow {
  return {
    id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    documentType: FiscalDocumentType.FACTURA_B,
    arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    saleId: 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    saleNumber: 'V-00101',
    saleReturnId: null,
    customerName: 'Hospital Norte',
    amount: '150000.00',
    attemptCount: 2,
    lastAttemptAt: '2026-08-13T15:30:00.000Z',
    nextRetryAt: '2026-08-13T16:00:00.000Z',
    arcaErrorMessage: 'Timeout de red.',
    hasActiveRetryJob: false,
    isRetryable: true,
    createdAt: '2026-08-13T12:00:00.000Z',
    ...overrides,
  };
}

export function buildPaginatedFiscalAlertsResponse(
  data: IFiscalAlertRow[],
  metaOverrides?: Partial<IPaginatedFiscalAlertsResponse['meta']>,
): IPaginatedFiscalAlertsResponse {
  return {
    data,
    meta: {
      total: data.length,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      ...metaOverrides,
    },
  };
}

export function buildFiscalAlertsCount(
  overrides?: Partial<IFiscalAlertsCount>,
): IFiscalAlertsCount {
  return {
    pending: 1,
    rejected: 1,
    total: 2,
    ...overrides,
  };
}

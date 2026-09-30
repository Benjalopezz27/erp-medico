import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ArcaStatus, FiscalDocumentType } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import {
  getFiscalAlertsApi,
  getFiscalAlertsCountApi,
  retryFiscalDocumentApi,
} from './fiscal-alerts.api';
import {
  buildFiscalAlertRow,
  buildPaginatedFiscalAlertsResponse,
} from '../testing/fiscal-alerts-fixtures';

const fiscalDocumentId = '70000000-0000-4000-8000-000000000001';

describe('fiscal-alerts API', () => {
  it('sends tab/filters as query params to GET /sales/pending-fiscal', async () => {
    server.use(
      http.get('*/api/v1/sales/pending-fiscal', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('status')).toBe('RECHAZADO');
        expect(params.get('page')).toBe('2');
        expect(params.get('limit')).toBe('20');
        expect(params.get('documentType')).toBe(FiscalDocumentType.FACTURA_A);
        expect(params.get('search')).toBe('V-00101');
        return HttpResponse.json(buildPaginatedFiscalAlertsResponse([buildFiscalAlertRow()]));
      }),
    );
    const result = await getFiscalAlertsApi({
      tab: 'RECHAZADO',
      page: 2,
      limit: 20,
      documentType: FiscalDocumentType.FACTURA_A,
      search: 'V-00101',
    });
    expect(result.data).toHaveLength(1);
  });

  it('fetches the pending/rejected count via GET /sales/pending-fiscal/count', async () => {
    server.use(
      http.get('*/api/v1/sales/pending-fiscal/count', () => {
        return HttpResponse.json({ pending: 3, rejected: 1, total: 4 });
      }),
    );
    const result = await getFiscalAlertsCountApi();
    expect(result).toEqual({ pending: 3, rejected: 1, total: 4 });
  });

  it('sends the idempotency key header on retry', async () => {
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${fiscalDocumentId}/retry`, ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBe('key-abc');
        return HttpResponse.json({ fiscalDocumentId, arcaStatus: ArcaStatus.EMITIDO });
      }),
    );
    const result = await retryFiscalDocumentApi(fiscalDocumentId, 'key-abc');
    expect(result.arcaStatus).toBe(ArcaStatus.EMITIDO);
  });
});

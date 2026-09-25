import { http, HttpResponse, RequestHandler } from 'msw';
import { buildPaginatedStockResponse } from '@/features/stock/testing/stock-fixtures';
import {
  buildFiscalAlertsCount,
  buildPaginatedFiscalAlertsResponse,
} from '@/features/fiscal-alerts/testing/fiscal-alerts-fixtures';

export const handlers: RequestHandler[] = [
  // Default stock alerts handler (returns total: 0 so Sidebar/Layout tests are clean by default)
  http.get('*/api/v1/stock/alerts', ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 10;
    return HttpResponse.json(buildPaginatedStockResponse([], { total: 0, limit }));
  }),

  // Default fiscal alerts handlers (empty by default so Sidebar/Layout tests stay clean)
  http.get('*/api/v1/sales/pending-fiscal', () => {
    return HttpResponse.json(buildPaginatedFiscalAlertsResponse([]));
  }),
  http.get('*/api/v1/sales/pending-fiscal/count', () => {
    return HttpResponse.json(buildFiscalAlertsCount({ pending: 0, rejected: 0, total: 0 }));
  }),
  http.post('*/api/v1/sales/pending-fiscal/:id/retry', () => {
    return HttpResponse.json({ fiscalDocumentId: 'unused', arcaStatus: 'PENDIENTE_FACTURACION' });
  }),
];

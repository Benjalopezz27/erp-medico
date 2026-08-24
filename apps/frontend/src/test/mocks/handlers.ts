import { http, HttpResponse, RequestHandler } from 'msw';
import { buildPaginatedStockResponse } from '@/features/stock/testing/stock-fixtures';

export const handlers: RequestHandler[] = [
  // Default stock alerts handler (returns total: 0 so Sidebar/Layout tests are clean by default)
  http.get('*/api/v1/stock/alerts', ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 10;
    return HttpResponse.json(buildPaginatedStockResponse([], { total: 0, limit }));
  }),
];

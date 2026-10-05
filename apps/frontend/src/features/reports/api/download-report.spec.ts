import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { downloadReport, parseFilename } from './download-report';

describe('parseFilename', () => {
  it('reads the name from Content-Disposition', () => {
    expect(parseFilename('attachment; filename="sales-2026-01-01.xlsx"', 'x')).toBe(
      'sales-2026-01-01.xlsx',
    );
  });

  it('falls back when the header is missing', () => {
    expect(parseFilename(undefined, 'fallback.pdf')).toBe('fallback.pdf');
  });
});

describe('downloadReport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('requests the report with format and filters and saves the file', async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get('*/api/v1/reports/sales', ({ request }) => {
        query = new URL(request.url).searchParams;
        return new HttpResponse('data', {
          headers: { 'Content-Disposition': 'attachment; filename="sales-2026-01-01.xlsx"' },
        });
      }),
    );
    window.URL.createObjectURL = vi.fn(() => 'blob:x');
    window.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadReport('sales', 'excel', { from: '2026-01-01', customerId: undefined });

    expect(query?.get('format')).toBe('excel');
    expect(query?.get('from')).toBe('2026-01-01');
    expect(query?.has('customerId')).toBe(false);
    expect(click).toHaveBeenCalledOnce();
  });
});

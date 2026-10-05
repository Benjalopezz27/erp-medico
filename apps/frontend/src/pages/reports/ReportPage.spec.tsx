import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { downloadReport } from '@/features/reports/api/download-report';
import { REPORT_CONFIGS } from '@/features/reports/report-configs';
import { ReportPage } from './ReportPage';
import { ReportsIndexPage } from './ReportsIndexPage';

vi.mock('@/features/reports/api/download-report', async (orig) => ({
  ...(await orig<object>()),
  downloadReport: vi.fn(async () => undefined),
}));

const salesReport = {
  title: 'Ventas por período',
  columns: [
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'total', header: 'Total', type: 'money' },
  ],
  rows: [
    { date: '01/10/2026', total: '1500.50' },
    { date: 'TOTAL', total: '1500.50' },
  ],
};

function renderReport(type: string) {
  const router = createTestRouter(
    [{ path: '/reports/$type', component: ReportPage }] as never,
    `/reports/${type}`,
  );
  return renderWithRouter({ router });
}

describe('ReportPage', () => {
  beforeEach(() => {
    vi.mocked(downloadReport).mockClear();
    server.use(
      http.get('*/api/v1/customers', () =>
        HttpResponse.json({
          data: [{ id: 'c-1', businessName: 'Farmacia Sur' }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        }),
      ),
    );
  });

  it('renders the report rows with formatted money and the TOTAL row', async () => {
    server.use(http.get('*/api/v1/reports/sales', () => HttpResponse.json(salesReport)));
    renderReport('sales');
    expect(await screen.findByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getAllByText(/1\.500,50/)).toHaveLength(2);
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });

  it('sends the chosen filters only after pressing Generar reporte', async () => {
    const urls: string[] = [];
    server.use(
      http.get('*/api/v1/reports/sales', ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(salesReport);
      }),
    );
    const { user } = renderReport('sales');
    await screen.findByText('01/10/2026');
    await user.type(screen.getByLabelText('Desde'), '2026-10-01');
    expect(urls).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /generar reporte/i }));
    await waitFor(() => expect(urls.at(-1)).toContain('from=2026-10-01'));
  });

  it('exports Excel and PDF with the applied filters', async () => {
    server.use(http.get('*/api/v1/reports/sales', () => HttpResponse.json(salesReport)));
    const { user } = renderReport('sales');
    await screen.findByText('01/10/2026');
    await user.click(screen.getByRole('button', { name: /exportar excel/i }));
    await user.click(screen.getByRole('button', { name: /exportar pdf/i }));
    expect(downloadReport).toHaveBeenNthCalledWith(1, 'sales', 'excel', {});
    expect(downloadReport).toHaveBeenNthCalledWith(2, 'sales', 'pdf', {});
  });

  it('shows an empty message when there are no rows', async () => {
    server.use(
      http.get('*/api/v1/reports/sales', () => HttpResponse.json({ ...salesReport, rows: [] })),
    );
    renderReport('sales');
    expect(await screen.findByText(/sin resultados/i)).toBeInTheDocument();
  });

  it('shows the API error', async () => {
    server.use(
      http.get('*/api/v1/reports/sales', () =>
        HttpResponse.json({ message: 'from inválido' }, { status: 400 }),
      ),
    );
    renderReport('sales');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('rejects an unknown report type', async () => {
    renderReport('nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
  });
});

describe('ReportsIndexPage', () => {
  it('links to the nine reports', async () => {
    const router = createTestRouter(
      [
        { path: '/reports', component: ReportsIndexPage },
        { path: '/reports/$type', component: ReportPage },
      ] as never,
      '/reports',
    );
    renderWithRouter({ router });
    expect(await screen.findAllByRole('link')).toHaveLength(REPORT_CONFIGS.length);
    expect(REPORT_CONFIGS).toHaveLength(9);
  });
});

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { DebtorStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { validateReceivablesSearchParams } from '@/features/receivables/schemas/receivables.schema';
import {
  buildDebtorRow,
  buildDebtorsResponse,
} from '@/features/receivables/testing/receivables-fixtures';
import { ReceivablesPage } from './ReceivablesPage';

function renderPage(path = '/receivables') {
  const router = createTestRouter(
    [
      {
        path: '/receivables',
        component: ReceivablesPage,
        validateSearch: validateReceivablesSearchParams,
      },
      { path: '/customers/$id', component: () => <div>Detalle</div> },
    ] as never,
    path,
  );
  return renderWithRouter({ router });
}

describe('ReceivablesPage', () => {
  it('lists debtors with aging buckets and status badges', async () => {
    server.use(
      http.get('*/api/v1/receivables', () =>
        HttpResponse.json(
          buildDebtorsResponse([
            buildDebtorRow(),
            buildDebtorRow({
              customerId: '10000000-0000-4000-8000-000000000002',
              customerName: 'Droguería Sur',
              status: DebtorStatus.AL_DIA,
            }),
          ]),
        ),
      ),
    );
    renderPage();
    expect(await screen.findByRole('link', { name: 'Farmacia Central' })).toHaveAttribute(
      'href',
      '/customers/10000000-0000-4000-8000-000000000001',
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Moroso')).toBeInTheDocument();
    expect(table.getByText('Al día')).toBeInTheDocument();
    expect(screen.getByText('2 clientes')).toBeInTheDocument();
  });

  it('shows the empty state when nobody owes anything', async () => {
    server.use(http.get('*/api/v1/receivables', () => HttpResponse.json(buildDebtorsResponse([]))));
    renderPage();
    expect(await screen.findByText(/no hay clientes con deuda/i)).toBeInTheDocument();
  });

  it('sends the status filter to the API', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/v1/receivables', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status') ?? '');
        return HttpResponse.json(buildDebtorsResponse());
      }),
    );
    const { user } = renderPage();
    await screen.findByRole('link', { name: 'Farmacia Central' });
    await user.selectOptions(screen.getByLabelText('Estado de deuda'), DebtorStatus.MOROSO);
    await waitFor(() => expect(seen).toContain(DebtorStatus.MOROSO));
  });

  it('shows an error with retry when the request fails', async () => {
    server.use(
      http.get('*/api/v1/receivables', () =>
        HttpResponse.json({ statusCode: 500, message: 'boom' }, { status: 500 }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

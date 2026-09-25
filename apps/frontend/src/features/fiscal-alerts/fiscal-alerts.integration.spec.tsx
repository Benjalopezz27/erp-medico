import { useState } from 'react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { FiscalAlertsTable } from './components/FiscalAlertsTable';
import { RetryFiscalDocumentModal } from './components/RetryFiscalDocumentModal';
import { useFiscalAlertsCountQuery, useFiscalAlertsQuery } from './hooks/use-fiscal-alerts-query';
import {
  buildFiscalAlertRow,
  buildPaginatedFiscalAlertsResponse,
} from './testing/fiscal-alerts-fixtures';
import type { IFiscalAlertRow } from './types/fiscal-alerts.types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

function DemoHarness() {
  const query = useFiscalAlertsQuery({ tab: 'PENDIENTE_FACTURACION', page: 1, limit: 20 });
  const countQuery = useFiscalAlertsCountQuery(true);
  const [retryRow, setRetryRow] = useState<IFiscalAlertRow | null>(null);
  return (
    <div>
      <span data-testid="pending-count">{countQuery.data ?? 0}</span>
      <FiscalAlertsTable
        rows={query.data?.data ?? []}
        loading={query.isLoading}
        onRetry={setRetryRow}
      />
      <RetryFiscalDocumentModal
        isOpen={retryRow !== null}
        onClose={() => setRetryRow(null)}
        row={retryRow}
      />
    </div>
  );
}

describe('Fiscal alerts demo: fallo -> pendiente -> reintento -> emisión', () => {
  it('reconciles list and count after a successful manual retry', async () => {
    const pendingRow = buildFiscalAlertRow();
    let retried = false;

    server.use(
      http.get('*/api/v1/sales/pending-fiscal', () => {
        return HttpResponse.json(
          retried
            ? buildPaginatedFiscalAlertsResponse([])
            : buildPaginatedFiscalAlertsResponse([pendingRow]),
        );
      }),
      http.get('*/api/v1/sales/pending-fiscal/count', () => {
        return HttpResponse.json(
          retried ? { pending: 0, rejected: 0, total: 0 } : { pending: 1, rejected: 0, total: 1 },
        );
      }),
      http.post(`*/api/v1/sales/pending-fiscal/${pendingRow.id}/retry`, () => {
        retried = true;
        return HttpResponse.json({ fiscalDocumentId: pendingRow.id, arcaStatus: 'EMITIDO' });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<DemoHarness />);

    expect(await screen.findByText(pendingRow.saleNumber)).toBeInTheDocument();
    expect(await screen.findByTestId('pending-count')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar reintento/i }));

    await waitFor(() =>
      expect(
        screen.getByText('No hay comprobantes pendientes ni rechazados con los filtros aplicados.'),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByTestId('pending-count')).toHaveTextContent('0'));
  });
});

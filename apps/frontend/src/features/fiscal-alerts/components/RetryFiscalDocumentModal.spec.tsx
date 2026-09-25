import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { buildFiscalAlertRow } from '../testing/fiscal-alerts-fixtures';
import { RetryFiscalDocumentModal } from './RetryFiscalDocumentModal';

const row = buildFiscalAlertRow();

describe('RetryFiscalDocumentModal', () => {
  it('confirms once even on rapid double click and disables the button while pending', async () => {
    let callCount = 0;
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${row.id}/retry`, async () => {
        callCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return HttpResponse.json({ fiscalDocumentId: row.id, arcaStatus: 'EMITIDO' });
      }),
    );
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<RetryFiscalDocumentModal isOpen onClose={onClose} row={row} />);

    const confirmButton = screen.getByRole('button', { name: /confirmar reintento/i });
    await user.dblClick(confirmButton);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(callCount).toBe(1);
  });

  it('reconciles and closes when the document was already issued concurrently (409)', async () => {
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${row.id}/retry`, () =>
        HttpResponse.json({ code: 'FISCAL_DOCUMENT_ALREADY_ISSUED' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<RetryFiscalDocumentModal isOpen onClose={onClose} row={row} />);

    await user.click(screen.getByRole('button', { name: /confirmar reintento/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('reconciles and closes when a retry job is already active (409)', async () => {
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${row.id}/retry`, () =>
        HttpResponse.json({ code: 'FISCAL_RETRY_JOB_ACTIVE' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<RetryFiscalDocumentModal isOpen onClose={onClose} row={row} />);

    await user.click(screen.getByRole('button', { name: /confirmar reintento/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows a stable, actionable message on 404 without closing prematurely on network fluke', async () => {
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${row.id}/retry`, () =>
        HttpResponse.json({ code: 'FISCAL_DOCUMENT_NOT_FOUND' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<RetryFiscalDocumentModal isOpen onClose={onClose} row={row} />);

    await user.click(screen.getByRole('button', { name: /confirmar reintento/i }));

    expect(
      await screen.findByText('El comprobante no existe o ya no está disponible.'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an actionable message on 422 for a non-retryable rejection', async () => {
    server.use(
      http.post(`*/api/v1/sales/pending-fiscal/${row.id}/retry`, () =>
        HttpResponse.json({ code: 'FISCAL_DOCUMENT_NOT_RETRYABLE' }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<RetryFiscalDocumentModal isOpen onClose={vi.fn()} row={row} />);

    await user.click(screen.getByRole('button', { name: /confirmar reintento/i }));

    expect(
      await screen.findByText('Este rechazo no admite reintento automático.'),
    ).toBeInTheDocument();
  });
});

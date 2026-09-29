import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerAccountTab } from './CustomerAccountTab';
import { CUSTOMER_ID, buildAccountResponse } from '../testing/receivables-fixtures';

function serveAccount(body = buildAccountResponse()) {
  server.use(
    http.get(`*/api/v1/customers/${CUSTOMER_ID}/account-receivable`, () => HttpResponse.json(body)),
  );
}

describe('CustomerAccountTab', () => {
  it('shows balance, aging, pending invoices and the ledger with running balance', async () => {
    serveAccount();
    renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);

    expect(await screen.findByText('Saldo total')).toBeInTheDocument();
    expect(screen.getByText(/484,00/)).toBeInTheDocument();
    expect(screen.getByText('Facturas pendientes', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText('V-00000001').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Nota de crédito')).toBeInTheDocument();
    expect(screen.getByText(/-\s?\$\s?121,00|-121,00/)).toBeInTheDocument();
    expect(screen.queryByText(/supera el límite/i)).not.toBeInTheDocument();
  });

  it('warns when the credit limit is exceeded', async () => {
    const base = buildAccountResponse();
    serveAccount({ ...base, summary: { ...base.summary, exceedsCreditLimit: true } });
    renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);
    expect(await screen.findByText(/supera el límite de crédito/i)).toBeInTheDocument();
  });

  it('shows empty states for a customer without debt', async () => {
    const base = buildAccountResponse();
    serveAccount({
      summary: { ...base.summary, totalBalance: '0.00', pendingCount: 0, partialCount: 0 },
      pendingInvoices: [],
      ledger: { data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } },
    });
    renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);
    expect(await screen.findByText('Sin facturas pendientes.')).toBeInTheDocument();
    expect(screen.getByText('Sin movimientos registrados.')).toBeInTheDocument();
  });

  it('keeps "Registrar cobro" disabled until payments exist', async () => {
    serveAccount();
    renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);
    expect(await screen.findByRole('button', { name: /registrar cobro/i })).toBeDisabled();
  });

  it('downloads the statement PDF', async () => {
    serveAccount();
    let requested = false;
    server.use(
      http.get(`*/api/v1/customers/${CUSTOMER_ID}/account-receivable/pdf`, () => {
        requested = true;
        return new HttpResponse('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    const { user } = renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);

    await user.click(await screen.findByRole('button', { name: /exportar pdf/i }));
    await waitFor(() => expect(requested).toBe(true));
    await waitFor(() => expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock'));
  });

  it('shows an error with retry when the account cannot be loaded', async () => {
    server.use(
      http.get(`*/api/v1/customers/${CUSTOMER_ID}/account-receivable`, () =>
        HttpResponse.json({ statusCode: 500, message: 'boom' }, { status: 500 }),
      ),
    );
    renderWithProviders(<CustomerAccountTab customerId={CUSTOMER_ID} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

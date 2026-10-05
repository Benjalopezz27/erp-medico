import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ITreasuryMovement } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { TreasuryPage } from './TreasuryPage';

const movement = (over: Partial<ITreasuryMovement> = {}): ITreasuryMovement => ({
  id: 'm1',
  accountType: 'EFECTIVO' as ITreasuryMovement['accountType'],
  movementType: 'INGRESO' as ITreasuryMovement['movementType'],
  amount: '50000.00',
  concept: 'Cobro - Recibo 0001-00000050',
  referenceType: 'PAYMENT',
  referenceId: 'p1',
  user: { id: 'u1', name: 'Ana' },
  createdAt: '2026-10-01T13:00:00.000Z',
  ...over,
});
const list = (data: ITreasuryMovement[]) => ({
  data,
  meta: { page: 1, limit: 20, total: data.length, totalPages: 1 },
});
const summary = {
  accounts: [
    { accountType: 'BANCOS', name: 'Bancos', balance: '15430000.00' },
    { accountType: 'CHEQUES_CARTERA', name: 'Cheques', balance: '4500000.00' },
    { accountType: 'EFECTIVO', name: 'Efectivo', balance: '1250000.00' },
  ],
};

function renderPage() {
  const router = createTestRouter(
    [{ path: '/treasury', component: TreasuryPage }] as never,
    '/treasury',
  );
  return renderWithRouter({ router });
}

describe('TreasuryPage', () => {
  it('shows the three balances in fixed order and the movements', async () => {
    server.use(
      http.get('*/api/v1/treasury/summary', () => HttpResponse.json(summary)),
      http.get('*/api/v1/treasury/movements', () => HttpResponse.json(list([movement()]))),
    );
    renderPage();
    expect(await screen.findByText('Cobro - Recibo 0001-00000050')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Efectivo', 'Bancos / Transferencias', 'Cheques en cartera']);
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('sends the selected filters to the API', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get('*/api/v1/treasury/summary', () => HttpResponse.json(summary)),
      http.get('*/api/v1/treasury/movements', ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(list([]));
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No hay movimientos para los filtros elegidos.');
    await user.selectOptions(screen.getByLabelText('Filtrar cuenta'), 'BANCOS');
    await waitFor(() => expect(queries.at(-1)?.get('accountType')).toBe('BANCOS'));
    expect(queries[0].has('accountType')).toBe(false);
  });

  it('validates and posts a manual movement', async () => {
    let body: unknown;
    server.use(
      http.get('*/api/v1/treasury/summary', () => HttpResponse.json(summary)),
      http.get('*/api/v1/treasury/movements', () => HttpResponse.json(list([]))),
      http.post('*/api/v1/treasury/movements', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Movimiento manual/ }));
    await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));
    expect(screen.getByText(/Ingrese un monto mayor a 0/)).toBeInTheDocument();
    expect(body).toBeUndefined();

    const dialog = within(screen.getByRole('dialog'));
    await user.selectOptions(dialog.getByLabelText('Tipo'), 'EGRESO');
    await user.type(dialog.getByLabelText('Monto'), '10000,5');
    await user.type(dialog.getByLabelText('Concepto'), 'Gasto: librería');
    await user.click(dialog.getByRole('button', { name: 'Registrar movimiento' }));
    await waitFor(() =>
      expect(body).toEqual({
        accountType: 'EFECTIVO',
        movementType: 'EGRESO',
        amount: '10000.5',
        concept: 'Gasto: librería',
      }),
    );
  });
});

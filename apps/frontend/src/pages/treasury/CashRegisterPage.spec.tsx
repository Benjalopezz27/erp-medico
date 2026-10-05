import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { ICashRegisterState } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { CashRegisterPage } from './CashRegisterPage';

const closedState: ICashRegisterState = {
  open: null,
  movements: [],
  lastClosed: {
    id: 'c0',
    openedAt: '2026-10-04T11:00:00.000Z',
    openingBalance: '1000.00',
    closedAt: '2026-10-04T21:30:00.000Z',
    expectedBalance: '1200.00',
    actualBalance: '1200.00',
    difference: '0.00',
    observation: null,
  },
};
const openState: ICashRegisterState = {
  open: {
    id: 'c1',
    openedAt: '2026-10-05T11:00:00.000Z',
    openingBalance: '1000.00',
    closedAt: null,
    expectedBalance: '1050.00',
    actualBalance: null,
    difference: null,
    observation: null,
  },
  movements: [
    {
      id: 'm1',
      accountType: 'EFECTIVO' as never,
      movementType: 'INGRESO' as never,
      amount: '60.00',
      concept: 'Venta mostrador',
      referenceType: null,
      referenceId: null,
      user: null,
      createdAt: '2026-10-05T12:30:00.000Z',
    },
  ],
  lastClosed: null,
};

function renderPage(state: ICashRegisterState) {
  server.use(http.get('*/api/v1/cash-register/current', () => HttpResponse.json(state)));
  const router = createTestRouter(
    [{ path: '/treasury/cash-register', component: CashRegisterPage }] as never,
    '/treasury/cash-register',
  );
  return renderWithRouter({ router });
}

describe('CashRegisterPage', () => {
  it('shows the closed state with the last closing and opens with the opening balance', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/v1/cash-register/open', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c1' });
      }),
    );
    const { user } = renderPage(closedState);
    expect(await screen.findByRole('link', { name: /volver a tesorería/i })).toBeInTheDocument();
    expect(await screen.findByText(/La caja está cerrada/i)).toBeInTheDocument();
    expect(screen.getByText(/Último cierre/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Saldo inicial'), '1500,50');
    await user.click(screen.getByRole('button', { name: /abrir caja/i }));
    await waitFor(() => expect(body).toEqual({ openingBalance: '1500.50' }));
  });

  it('rejects an invalid opening balance without calling the API', async () => {
    const { user } = renderPage(closedState);
    await user.type(await screen.findByLabelText('Saldo inicial'), '-5');
    await user.click(screen.getByRole('button', { name: /abrir caja/i }));
    expect(await screen.findByText(/monto válido/i)).toBeInTheDocument();
  });

  it('lists the shift movements and computes the difference live', async () => {
    const { user } = renderPage(openState);
    expect(await screen.findByText('Venta mostrador')).toBeInTheDocument();
    expect(screen.getByText(/Saldo esperado/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Saldo contado'), '1010');
    expect(screen.getByTestId('difference')).toHaveTextContent(/^-.*40,00$/);
  });

  it('requires an observation when there is a difference, then closes', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/v1/cash-register/close', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c1', difference: '-40.00' });
      }),
    );
    const { user } = renderPage(openState);
    await user.type(await screen.findByLabelText('Saldo contado'), '1010');
    await user.click(screen.getByRole('button', { name: /cerrar y registrar arqueo/i }));
    expect(await screen.findByText(/observación es obligatoria/i)).toBeInTheDocument();
    expect(body).toBeUndefined();
    await user.type(screen.getByLabelText('Observación'), 'Faltó cambio');
    await user.click(screen.getByRole('button', { name: /cerrar y registrar arqueo/i }));
    await waitFor(() =>
      expect(body).toEqual({ actualBalance: '1010', observation: 'Faltó cambio' }),
    );
  });

  it('closes without observation when the count matches', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/v1/cash-register/close', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c1', difference: '0.00' });
      }),
    );
    const { user } = renderPage(openState);
    await user.type(await screen.findByLabelText('Saldo contado'), '1050');
    await user.click(screen.getByRole('button', { name: /cerrar y registrar arqueo/i }));
    await waitFor(() => expect(body).toEqual({ actualBalance: '1050' }));
  });
});

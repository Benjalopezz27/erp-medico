import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { CheckStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import {
  CHECK_ID,
  buildCheck,
  buildCheckDetail,
  buildCheckList,
} from '@/features/checks/testing/checks-fixtures';
import { ChecksPage } from './ChecksPage';

function renderPage() {
  const router = createTestRouter(
    [{ path: '/treasury/checks', component: ChecksPage }] as never,
    '/treasury/checks',
  );
  return renderWithRouter({ router });
}

describe('ChecksPage', () => {
  it('lists checks with the status badge and the 7-day warning', async () => {
    server.use(
      http.get('*/api/v1/checks', () =>
        HttpResponse.json(buildCheckList([buildCheck({ status: CheckStatus.EN_CARTERA })], 1)),
      ),
    );
    renderPage();
    expect(await screen.findByRole('link', { name: /volver a tesorería/i })).toBeInTheDocument();
    expect(await screen.findByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('Farmacia Central')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 cheque vence en los próximos 7 días.');
  });

  it('offers only the actions allowed by each status', async () => {
    server.use(
      http.get('*/api/v1/checks', () =>
        HttpResponse.json(
          buildCheckList([
            buildCheck({ id: 'a', checkNumber: '1', status: CheckStatus.RECIBIDO }),
            buildCheck({ id: 'b', checkNumber: '2', status: CheckStatus.EN_CARTERA }),
            buildCheck({ id: 'c', checkNumber: '3', status: CheckStatus.DEPOSITADO }),
            buildCheck({ id: 'd', checkNumber: '4', status: CheckStatus.ENDOSADO }),
            buildCheck({ id: 'e', checkNumber: '5', status: CheckStatus.RECHAZADO }),
          ]),
        ),
      ),
    );
    renderPage();
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6));
    const rows = screen.getAllByRole('row');
    const buttonsOf = (n: string) =>
      within(rows.find((row) => within(row).queryByText(n))!).queryAllByRole('button');
    expect(buttonsOf('1')).toHaveLength(1); // Mover a cartera
    expect(buttonsOf('2')).toHaveLength(3); // Depositar, Endosar, Rechazo
    expect(buttonsOf('3')).toHaveLength(1); // Rechazo
    expect(buttonsOf('4')).toHaveLength(0);
    expect(buttonsOf('5')).toHaveLength(0);
  });

  it('sends the status filter to the API', async () => {
    const urls: string[] = [];
    server.use(
      http.get('*/api/v1/checks', ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json(buildCheckList());
      }),
    );
    const { user } = renderPage();
    await screen.findByText('12345678');
    await user.selectOptions(screen.getByLabelText('Estado'), CheckStatus.DEPOSITADO);
    await waitFor(() => expect(urls.at(-1)).toContain('status=DEPOSITADO'));
  });

  it('moves a RECIBIDO check to cartera', async () => {
    let called = false;
    server.use(
      http.get('*/api/v1/checks', () =>
        HttpResponse.json(buildCheckList([buildCheck({ status: CheckStatus.RECIBIDO })])),
      ),
      http.patch(`*/api/v1/checks/${CHECK_ID}/to-cartera`, () => {
        called = true;
        return HttpResponse.json(buildCheck({ status: CheckStatus.EN_CARTERA }));
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /mover a cartera/i }));
    await waitFor(() => expect(called).toBe(true));
  });

  it('shows the impact in the modal and sends the rejection only after confirming', async () => {
    let body: unknown;
    server.use(
      http.get('*/api/v1/checks', () => HttpResponse.json(buildCheckList())),
      http.get(`*/api/v1/checks/${CHECK_ID}`, () => HttpResponse.json(buildCheckDetail())),
      http.patch(`*/api/v1/checks/${CHECK_ID}/reject`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildCheck({ status: CheckStatus.RECHAZADO }));
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /registrar rechazo/i }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('V-00000001')).toBeInTheDocument();
    expect(within(dialog).getByText('V-00000002')).toBeInTheDocument();
    expect(within(dialog).getByText(/Saldo del cliente aumenta: .*200,00/)).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.type(within(dialog).getByLabelText('Motivo del rechazo'), 'Sin fondos');
    await user.click(within(dialog).getByRole('button', { name: /confirmar rechazo/i }));
    await waitFor(() => expect(body).toEqual({ reason: 'Sin fondos' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('blocks the rejection and explains why when the ledger is inconsistent', async () => {
    server.use(
      http.get('*/api/v1/checks', () => HttpResponse.json(buildCheckList())),
      http.get(`*/api/v1/checks/${CHECK_ID}`, () =>
        HttpResponse.json(
          buildCheckDetail({
            rejectionImpact: null,
            rejectionBlockedReason: 'Revertir deja la factura V-1 con más saldo que su original.',
          }),
        ),
      ),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /registrar rechazo/i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/más saldo que su original/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /confirmar rechazo/i })).toBeDisabled();
  });

  it('endorses a check to the chosen supplier', async () => {
    let body: unknown;
    server.use(
      http.get('*/api/v1/checks', () => HttpResponse.json(buildCheckList())),
      http.get('*/api/v1/suppliers', () =>
        HttpResponse.json({
          data: [{ id: 's-1', businessName: 'Droguería Sur', cuit: '30700000001' }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        }),
      ),
      http.patch(`*/api/v1/checks/${CHECK_ID}/endorse`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildCheck({ status: CheckStatus.ENDOSADO }));
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /endosar cheque/i }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /confirmar endoso/i });
    expect(confirm).toBeDisabled();
    await user.selectOptions(await within(dialog).findByLabelText('Proveedor'), 's-1');
    await user.click(confirm);
    await waitFor(() => expect(body).toEqual({ supplierId: 's-1' }));
  });
});

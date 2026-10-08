import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AccountReceivableStatus, PaymentAllocationType, PaymentMethod } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import {
  CUSTOMER_ID,
  buildAccountResponse,
} from '@/features/receivables/testing/receivables-fixtures';
import { buildRegisterResponse, RECEIPT_ID } from '@/features/payments/testing/payments-fixtures';
import { PaymentFormPage } from './PaymentFormPage';

const invoice = (id: string, ref: string, balance: string, createdAt: string) => ({
  id,
  customerId: CUSTOMER_ID,
  documentReference: ref,
  originalAmount: balance,
  currentBalance: balance,
  status: AccountReceivableStatus.PENDIENTE,
  createdAt,
  updatedAt: createdAt,
});

function serveAccount() {
  server.use(
    http.get(`*/api/v1/customers/${CUSTOMER_ID}/account-receivable`, () =>
      HttpResponse.json({
        ...buildAccountResponse(),
        pendingInvoices: [
          invoice('ar-new', 'V-00000003', '100.00', '2026-08-10T12:00:00Z'),
          invoice('ar-old', 'V-00000001', '150.00', '2026-06-10T12:00:00Z'),
          invoice('ar-mid', 'V-00000002', '200.00', '2026-07-05T12:00:00Z'),
        ],
      }),
    ),
  );
}

function renderPage() {
  const router = createTestRouter(
    [
      {
        path: '/payments/new',
        component: PaymentFormPage,
        validateSearch: (s: Record<string, unknown>) => ({
          customerId: typeof s.customerId === 'string' ? s.customerId : undefined,
        }),
      },
      { path: '/receipts/$id', component: () => <div>Recibo emitido</div> },
      { path: '/customers/$id', component: () => <div>Detalle</div> },
    ] as never,
    `/payments/new?customerId=${CUSTOMER_ID}`,
  );
  return renderWithRouter({ router });
}

const amountInput = (ref: string) => screen.getByLabelText(`Monto a aplicar ${ref}`);
const submit = () => screen.getByRole('button', { name: /registrar cobro y emitir recibo/i });

describe('PaymentFormPage', () => {
  it('loads the pending invoices of the preselected customer', async () => {
    serveAccount();
    renderPage();
    expect(await screen.findByText('V-00000001')).toBeInTheDocument();
    expect(screen.getByText('Farmacia Central')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('fills the inputs oldest first when applying by age', async () => {
    serveAccount();
    const { user } = renderPage();
    await screen.findByText('V-00000001');

    await user.type(screen.getByLabelText('Total cobrado'), '250,00');

    expect(amountInput('V-00000001')).toHaveValue('150,00');
    expect(amountInput('V-00000002')).toHaveValue('100,00');
    expect(amountInput('V-00000003')).toHaveValue('');
    expect(submit()).toBeEnabled();
  });

  it('keeps submit disabled while applied and collected totals differ (manual mode)', async () => {
    serveAccount();
    const { user } = renderPage();
    await screen.findByText('V-00000001');
    await user.click(screen.getByLabelText('Selección manual'));

    await user.type(screen.getByLabelText('Total cobrado'), '100,00');
    await user.type(amountInput('V-00000001'), '80,00');
    expect(screen.getByText(/no coincide con el cobrado/i)).toBeInTheDocument();
    expect(submit()).toBeDisabled();

    await user.clear(amountInput('V-00000001'));
    await user.type(amountInput('V-00000001'), '100,00');
    expect(submit()).toBeEnabled();
  });

  it('blocks a manual amount above the invoice balance', async () => {
    serveAccount();
    const { user } = renderPage();
    await screen.findByText('V-00000001');
    await user.click(screen.getByLabelText('Selección manual'));
    await user.type(screen.getByLabelText('Total cobrado'), '160,00');
    await user.type(amountInput('V-00000001'), '160,00');
    expect(screen.getByText(/excede el saldo/i)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('sends the by-age payload and navigates to the receipt', async () => {
    serveAccount();
    let body: unknown;
    server.use(
      http.post('*/api/v1/payments', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildRegisterResponse(), { status: 201 });
      }),
    );
    const { user } = renderPage();
    await screen.findByText('V-00000001');
    await user.type(screen.getByLabelText('Total cobrado'), '250,00');
    await user.click(submit());

    await waitFor(() => expect(screen.getByText('Recibo emitido')).toBeInTheDocument());
    expect(body).toEqual({
      customerId: CUSTOMER_ID,
      paymentMethod: PaymentMethod.EFECTIVO,
      mode: PaymentAllocationType.GLOBAL_AGE,
      totalAmount: '250.00',
      idempotencyKey: expect.any(String),
    });
    expect(RECEIPT_ID).toBeTruthy();
  });

  it('shows the server error and stays on the form', async () => {
    serveAccount();
    server.use(
      http.post('*/api/v1/payments', () =>
        HttpResponse.json(
          { statusCode: 409, message: 'El monto cobrado excede el saldo total del cliente.' },
          { status: 409 },
        ),
      ),
    );
    const { user } = renderPage();
    await screen.findByText('V-00000001');
    await user.type(screen.getByLabelText('Total cobrado'), '250,00');
    await user.click(submit());
    expect(await screen.findByText(/excede el saldo total/i)).toBeInTheDocument();
  });

  describe('cheque', () => {
    const fillCheck = async (user: ReturnType<typeof renderPage>['user']) => {
      await user.type(screen.getByLabelText('Banco'), 'Galicia');
      await user.type(screen.getByLabelText('N° de cheque'), '12345678');
      await user.type(screen.getByLabelText('Librador'), 'Juan Paz');
      await user.type(screen.getByLabelText('Fecha de vencimiento'), '2026-12-15');
    };

    it('shows the check fields only when the method is Cheque', async () => {
      serveAccount();
      const { user } = renderPage();
      await screen.findByText('V-00000001');
      expect(screen.queryByLabelText('Banco')).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText('Medio de cobro'), PaymentMethod.CHEQUE);
      expect(screen.getByLabelText('Banco')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha de vencimiento')).toBeInTheDocument();
    });

    it('keeps submit disabled until the check data is complete', async () => {
      serveAccount();
      const { user } = renderPage();
      await screen.findByText('V-00000001');
      await user.selectOptions(screen.getByLabelText('Medio de cobro'), PaymentMethod.CHEQUE);
      await user.type(screen.getByLabelText('Total cobrado'), '250,00');
      expect(submit()).toBeDisabled();

      await fillCheck(user);
      expect(submit()).toBeEnabled();
    });

    it('sends the check inside the payload', async () => {
      serveAccount();
      let body: unknown;
      server.use(
        http.post('*/api/v1/payments', async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(buildRegisterResponse(), { status: 201 });
        }),
      );
      const { user } = renderPage();
      await screen.findByText('V-00000001');
      await user.selectOptions(screen.getByLabelText('Medio de cobro'), PaymentMethod.CHEQUE);
      await user.type(screen.getByLabelText('Total cobrado'), '250,00');
      await fillCheck(user);
      await user.click(submit());

      await waitFor(() => expect(screen.getByText('Recibo emitido')).toBeInTheDocument());
      expect(body).toEqual({
        customerId: CUSTOMER_ID,
        paymentMethod: PaymentMethod.CHEQUE,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '250.00',
        idempotencyKey: expect.any(String),
        check: {
          bankName: 'Galicia',
          checkNumber: '12345678',
          drawerName: 'Juan Paz',
          dueDate: '2026-12-15',
        },
      });
    });
  });
});

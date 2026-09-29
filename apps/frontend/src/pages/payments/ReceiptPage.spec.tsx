import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { RECEIPT_ID, buildReceipt } from '@/features/payments/testing/payments-fixtures';
import { ReceiptPage } from './ReceiptPage';

function renderPage() {
  const router = createTestRouter(
    [
      { path: '/receipts/$id', component: ReceiptPage },
      { path: '/customers/$id', component: () => <div>Detalle</div> },
    ] as never,
    `/receipts/${RECEIPT_ID}`,
  );
  return renderWithRouter({ router });
}

describe('ReceiptPage', () => {
  it('shows the receipt with applied invoices and total', async () => {
    server.use(
      http.get(`*/api/v1/receipts/${RECEIPT_ID}`, () => HttpResponse.json(buildReceipt())),
    );
    renderPage();
    expect(await screen.findByText('N° 0001-00000050')).toBeInTheDocument();
    expect(screen.getByText('Farmacia Central')).toBeInTheDocument();
    expect(screen.getByText('V-00000002')).toBeInTheDocument();
    expect(screen.getByText(/Total cobrado: .*250,00/)).toBeInTheDocument();
  });

  it('downloads the PDF when pressing Exportar PDF', async () => {
    let downloaded = false;
    server.use(
      http.get(`*/api/v1/receipts/${RECEIPT_ID}`, () => HttpResponse.json(buildReceipt())),
      http.get(`*/api/v1/receipts/${RECEIPT_ID}/pdf`, () => {
        downloaded = true;
        return new HttpResponse('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );
    window.URL.createObjectURL = vi.fn(() => 'blob:x');
    window.URL.revokeObjectURL = vi.fn();
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /exportar pdf/i }));
    await waitFor(() => expect(downloaded).toBe(true));
  });

  it('shows an error when the receipt does not exist', async () => {
    server.use(
      http.get(`*/api/v1/receipts/${RECEIPT_ID}`, () =>
        HttpResponse.json({ statusCode: 404, message: 'Recibo no encontrado.' }, { status: 404 }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/no encontrado/i);
  });
});

import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceStatus,
  type ISupplierInvoiceSummary,
} from '../types/supplier-invoices.types';
import { SupplierInvoicesTable } from './SupplierInvoicesTable';

const invoice: ISupplierInvoiceSummary = {
  id: '11111111-1111-4111-a111-111111111111',
  invoiceNumber: 'A-0001',
  supplier: { id: 'supplier', businessName: 'Proveedor Médico', cuit: '30123456789' },
  goodsReceipt: {
    id: 'receipt',
    receiptNumber: 'REC-000001',
    deliveryNoteNumber: 'REM-0001',
    createdAt: '2026-08-27T10:00:00.000Z',
  },
  purchaseOrder: { id: 'order', orderNumber: 'OC-000001' },
  invoiceDate: '2026-08-27',
  status: SupplierInvoiceStatus.AUTORIZADA,
  netTotal: '100.0000',
  taxTotal: '21.0000',
  totalAmount: '121.0000',
  costTolerancePercentageSnapshot: '5.0000',
  taxMode: SupplierInvoiceAdjustmentMode.AMOUNT,
  taxPercentage: null,
  itemCount: 1,
  observedLineCount: 0,
  user: { id: 'admin', name: 'Admin', email: 'admin@erp.com' },
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T10:00:00.000Z',
};

function renderTable() {
  const TablePage = () => <SupplierInvoicesTable invoices={[invoice]} loading={false} />;
  const DetailPage = () => <div>Detalle abierto</div>;
  const router = createTestRouter(
    [
      { path: '/purchases/supplier-invoices', component: TablePage },
      { path: '/purchases/supplier-invoices/$id', component: DetailPage },
    ],
    '/purchases/supplier-invoices',
  );
  return { router, ...renderWithRouter({ router }) };
}

describe('SupplierInvoicesTable', () => {
  it('opens the invoice detail when clicking any non-interactive part of the row', async () => {
    const { router, user, findByText } = renderTable();
    await user.click(await findByText('Proveedor Médico'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/purchases/supplier-invoices/11111111-1111-4111-a111-111111111111',
      ),
    );
  });

  it('exposes the row as a keyboard-accessible link', async () => {
    const { router, user, findByRole } = renderTable();
    const row = await findByRole('link', { name: 'Ver detalle de la factura A-0001' });
    row.focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/purchases/supplier-invoices/11111111-1111-4111-a111-111111111111',
      ),
    );
  });
});

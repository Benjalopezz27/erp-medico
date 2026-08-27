import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierInvoiceForm } from './SupplierInvoiceForm';
import { pendingReceiptFixture } from '../testing/supplier-invoice-fixtures';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-supplier-invoices', () => ({
  useCreateSupplierInvoiceMutation: () => ({ mutateAsync, isPending: false }),
}));

describe('SupplierInvoiceForm', () => {
  beforeEach(() => vi.clearAllMocks());
  it('prefills provisional cost and warns without blocking an excess quantity', async () => {
    const user = userEvent.setup();
    render(
      <SupplierInvoiceForm
        receipt={pendingReceiptFixture}
        onCreated={vi.fn()}
        onChangeReceipt={vi.fn()}
        onRefreshReceipt={vi.fn()}
        onReceiptUpdated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('unitPriceNet Producto médico')).toHaveValue('100.0000');
    await user.type(screen.getByLabelText('Número de comprobante'), 'A-1');
    await user.clear(screen.getByLabelText('invoicedQtyPurchaseUnit Producto médico'));
    await user.type(screen.getByLabelText('invoicedQtyPurchaseUnit Producto médico'), '6');
    await user.click(screen.getByRole('button', { name: /revisar factura/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('OBSERVADA');
    expect(screen.getByRole('dialog')).toHaveTextContent('$ 600,00');
  });

  it('submits canonical decimal strings and returns the authoritative response', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    mutateAsync.mockResolvedValue({ id: 'invoice-1' });
    render(
      <SupplierInvoiceForm
        receipt={pendingReceiptFixture}
        onCreated={onCreated}
        onChangeReceipt={vi.fn()}
        onRefreshReceipt={vi.fn()}
        onReceiptUpdated={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Número de comprobante'), 'A-1');
    await user.type(screen.getByLabelText('invoicedQtyPurchaseUnit Producto médico'), '4');
    await user.click(screen.getByRole('button', { name: /revisar factura/i }));
    await user.click(await screen.findByRole('button', { name: /registrar factura/i }));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'A-1',
        taxTotal: '0.0000',
        items: [
          expect.objectContaining({ invoicedQtyPurchaseUnit: '4.0000', unitPriceNet: '100.0000' }),
        ],
      }),
    );
    expect(onCreated).toHaveBeenCalledWith({ id: 'invoice-1' });
  });
});

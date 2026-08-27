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

  it('allows percentage discounts, bonuses, surcharges and VAT', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue({ id: 'invoice-percentage' });
    render(
      <SupplierInvoiceForm
        receipt={pendingReceiptFixture}
        onCreated={vi.fn()}
        onChangeReceipt={vi.fn()}
        onRefreshReceipt={vi.fn()}
        onReceiptUpdated={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Número de comprobante'), 'P-1');
    await user.type(screen.getByLabelText('invoicedQtyPurchaseUnit Producto médico'), '2');
    await user.selectOptions(screen.getByLabelText('Modo de IVA'), 'PERCENTAGE');
    await user.clear(screen.getByLabelText('Valor de IVA'));
    await user.type(screen.getByLabelText('Valor de IVA'), '21');

    for (const [field, percentage] of [
      ['discountNet', '10'],
      ['bonusNet', '5'],
      ['surchargeNet', '2'],
    ] as const) {
      await user.selectOptions(
        screen.getByLabelText(`Modo ${field} Producto médico`),
        'PERCENTAGE',
      );
      await user.clear(screen.getByLabelText(`${field} Producto médico`));
      await user.type(screen.getByLabelText(`${field} Producto médico`), percentage);
    }

    await user.click(screen.getByRole('button', { name: /revisar factura/i }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('$ 210,54');
    await user.click(screen.getByRole('button', { name: /registrar factura/i }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        taxMode: 'PERCENTAGE',
        taxPercentage: '21.0000',
        taxTotal: '0.0000',
        items: [
          expect.objectContaining({
            discountMode: 'PERCENTAGE',
            discountPercentage: '10.0000',
            bonusMode: 'PERCENTAGE',
            bonusPercentage: '5.0000',
            surchargeMode: 'PERCENTAGE',
            surchargePercentage: '2.0000',
          }),
        ],
      }),
    );
  });
});

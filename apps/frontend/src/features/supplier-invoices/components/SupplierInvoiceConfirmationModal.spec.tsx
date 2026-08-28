import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SupplierInvoiceStatus } from '../types/supplier-invoices.types';
import { SupplierInvoiceConfirmationModal } from './SupplierInvoiceConfirmationModal';

const invoice = {
  id: 'invoice',
  invoiceNumber: 'A-0001',
  status: SupplierInvoiceStatus.AUTORIZADA,
  supplier: { id: 'supplier', businessName: 'Proveedor', cuit: '30123456789' },
  goodsReceipt: {
    id: 'receipt',
    receiptNumber: 'REC-1',
    deliveryNoteNumber: 'REM-1',
    createdAt: '',
  },
  items: [
    {
      id: 'item',
      productCode: '001',
      productName: 'Producto',
      allocatedReceivedQtyBase: '70.00',
      provisionalCostUnitNet: '100.0000',
      realCostUnitNet: '90.0000',
      costDifferenceUnitNet: '-10.0000',
      purchaseUnitSymbol: 'CJA',
    },
  ],
} as any;

describe('SupplierInvoiceConfirmationModal', () => {
  it('explains impact without predicting FIFO and allows explicit confirmation', async () => {
    const onConfirm = vi.fn();
    render(
      <SupplierInvoiceConfirmationModal
        invoice={invoice}
        isOpen
        pending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText('Esta operación es irreversible.')).toBeInTheDocument();
    expect(screen.getByText(/reparto exacto.*ledger vigente/i)).toBeInTheDocument();
    expect(screen.getByText('70,00 u. base')).toBeInTheDocument();
    expect(screen.getByText('-$ 10,00')).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirmar y aplicar ajustes' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('prevents closing or submitting again while confirmation is pending', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <SupplierInvoiceConfirmationModal
        invoice={invoice}
        isOpen
        pending
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.queryByLabelText('Cerrar modal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    await userEvent.setup().keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

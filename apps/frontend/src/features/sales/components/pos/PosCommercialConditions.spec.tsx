import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PaymentMethod } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import { PosCommercialConditions } from './PosCommercialConditions';

const created = { id: 'c-new', businessName: 'Cliente Nuevo' };

vi.mock('@/features/customers/components/CustomerFormModal', () => ({
  CustomerFormModal: ({
    isOpen,
    mode,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    mode: string;
    onClose: () => void;
    onSuccess: (customer: typeof created) => void;
  }) =>
    isOpen ? (
      <div role="dialog" data-mode={mode}>
        <button type="button" onClick={() => onSuccess(created)}>
          Guardar cliente
        </button>
        <button type="button" onClick={onClose}>
          Cancelar alta
        </button>
      </div>
    ) : null,
}));

function renderConditions(onCustomerChange = vi.fn()) {
  const view = renderWithProviders(
    <PosCommercialConditions
      customer={null}
      isCreditSale={false}
      requiresFiscalInvoice={false}
      paymentMethod={PaymentMethod.EFECTIVO}
      disabled={false}
      onCustomerChange={onCustomerChange}
      onCreditChange={vi.fn()}
      onInvoiceChange={vi.fn()}
      onPaymentMethodChange={vi.fn()}
    />,
  );
  return { ...view, onCustomerChange };
}

describe('PosCommercialConditions - new customer', () => {
  it('opens the create modal and selects the created customer', async () => {
    const { user, onCustomerChange } = renderConditions();

    await user.click(screen.getByRole('button', { name: /Nuevo cliente/i }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-mode', 'create');

    await user.click(screen.getByRole('button', { name: 'Guardar cliente' }));
    expect(onCustomerChange).toHaveBeenCalledWith(created);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves the sale untouched when the modal is cancelled', async () => {
    const { user, onCustomerChange } = renderConditions();

    await user.click(screen.getByRole('button', { name: /Nuevo cliente/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar alta' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onCustomerChange).not.toHaveBeenCalled();
  });
});

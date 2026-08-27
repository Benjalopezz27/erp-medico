import { render, screen, fireEvent } from '@testing-library/react';
import { CancelPurchaseOrderModal } from './CancelPurchaseOrderModal';

import { PurchaseOrderStatus } from '../types/purchase-orders.types';

describe('CancelPurchaseOrderModal', () => {
  const mockOrder: any = {
    id: 'po-1',
    orderNumber: 'OC-000001',
    status: PurchaseOrderStatus.EMITIDA,
  };

  it('allows entering a cancellation reason and confirms', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CancelPurchaseOrderModal
        isOpen={true}
        order={mockOrder}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('¿Cancelar Orden de Compra OC-000001?')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Ej: Pedido duplicado/);
    fireEvent.change(textarea, { target: { value: 'Proveedor no tiene stock' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cancelación' }));
    expect(onConfirm).toHaveBeenCalledWith('Proveedor no tiene stock');
  });

  it('shows balance text when status is PARCIAL', () => {
    render(
      <CancelPurchaseOrderModal
        isOpen={true}
        order={{ ...mockOrder, status: PurchaseOrderStatus.PARCIAL }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('¿Cancelar saldo pendiente de OC-000001?')).toBeInTheDocument();
  });
});

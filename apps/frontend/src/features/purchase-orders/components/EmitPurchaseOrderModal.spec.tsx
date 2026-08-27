import { render, screen, fireEvent } from '@testing-library/react';
import { EmitPurchaseOrderModal } from './EmitPurchaseOrderModal';

import { PurchaseOrderStatus } from '../types/purchase-orders.types';

describe('EmitPurchaseOrderModal', () => {
  const mockOrder: any = {
    id: 'po-1',
    orderNumber: 'OC-000001',
    supplier: { id: 'sup-1', businessName: '3M Argentina', cuit: '30-12345678-9' },
    status: PurchaseOrderStatus.BORRADOR,
    itemsCount: 3,
    totalNet: '15000.0000',
  };

  it('renders order summary and emits confirmation', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <EmitPurchaseOrderModal
        isOpen={true}
        order={mockOrder}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('¿Emitir Orden de Compra OC-000001?')).toBeInTheDocument();
    expect(screen.getByText('3M Argentina')).toBeInTheDocument();
    expect(screen.getByText('$ 15.000,00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Emisión' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

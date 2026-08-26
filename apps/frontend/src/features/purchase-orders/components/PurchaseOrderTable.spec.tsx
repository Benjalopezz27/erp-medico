import { render, screen } from '@testing-library/react';
import { PurchaseOrderTable } from './PurchaseOrderTable';

import { PurchaseOrderStatus } from '../types/purchase-orders.types';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe('PurchaseOrderTable', () => {
  const mockOrders = [
    {
      id: 'po-1',
      orderNumber: 'OC-000001',
      supplier: { id: 'sup-1', businessName: '3M Argentina', cuit: '30-12345678-9' },
      status: PurchaseOrderStatus.BORRADOR,
      expectedDeliveryDate: null,
      notes: null,
      totalNet: '15000.0000',
      itemsCount: 3,
      user: { id: 'u-1', name: 'Admin', email: 'admin@erp.com' },
      emittedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
    },
    {
      id: 'po-2',
      orderNumber: 'OC-000002',
      supplier: { id: 'sup-2', businessName: 'Droguería Central', cuit: '30-98765432-1' },
      status: PurchaseOrderStatus.EMITIDA,
      expectedDeliveryDate: '2026-09-01',
      notes: null,
      totalNet: '450000.0000',
      itemsCount: 5,
      user: { id: 'u-1', name: 'Admin', email: 'admin@erp.com' },
      emittedAt: '2026-08-21T11:00:00Z',
      cancelledAt: null,
      cancelReason: null,
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-21T11:00:00Z',
    },
  ];

  it('renders table rows with order details', () => {
    render(<PurchaseOrderTable orders={mockOrders} />);

    expect(screen.getByText('OC-000001')).toBeInTheDocument();
    expect(screen.getByText('3M Argentina')).toBeInTheDocument();
    expect(screen.getByText('OC-000002')).toBeInTheDocument();
    expect(screen.getByText('Droguería Central')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Emitida')).toBeInTheDocument();
  });

  it('shows Edit button only for BORRADOR orders', () => {
    render(<PurchaseOrderTable orders={mockOrders} />);

    expect(screen.getByLabelText('Editar orden OC-000001')).toBeInTheDocument();
    expect(screen.queryByLabelText('Editar orden OC-000002')).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<PurchaseOrderTable orders={[]} isLoading={true} />);
    expect(screen.getByText('Cargando órdenes de compra...')).toBeInTheDocument();
  });

  it('renders empty state when no orders are found', () => {
    render(<PurchaseOrderTable orders={[]} isLoading={false} />);
    expect(screen.getByText('No se encontraron órdenes de compra')).toBeInTheDocument();
  });
});

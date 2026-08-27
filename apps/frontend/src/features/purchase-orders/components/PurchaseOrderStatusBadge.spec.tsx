import { render, screen } from '@testing-library/react';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';

import { PurchaseOrderStatus } from '../types/purchase-orders.types';

describe('PurchaseOrderStatusBadge', () => {
  it('renders Borrador label for BORRADOR', () => {
    render(<PurchaseOrderStatusBadge status={PurchaseOrderStatus.BORRADOR} />);
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('renders Emitida label for EMITIDA', () => {
    render(<PurchaseOrderStatusBadge status={PurchaseOrderStatus.EMITIDA} />);
    expect(screen.getByText('Emitida')).toBeInTheDocument();
  });

  it('renders Parcial label for PARCIAL', () => {
    render(<PurchaseOrderStatusBadge status={PurchaseOrderStatus.PARCIAL} />);
    expect(screen.getByText('Parcial')).toBeInTheDocument();
  });

  it('renders Completada label for COMPLETADA', () => {
    render(<PurchaseOrderStatusBadge status={PurchaseOrderStatus.COMPLETADA} />);
    expect(screen.getByText('Completada')).toBeInTheDocument();
  });

  it('renders Cancelada label for CANCELADA', () => {
    render(<PurchaseOrderStatusBadge status={PurchaseOrderStatus.CANCELADA} />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuarantineTable } from './QuarantineTable';
import {
  QuarantineStatus,
  type IQuarantineStock,
} from '../../types/quarantine.types';

describe('QuarantineTable Component', () => {
  const mockItemPending: IQuarantineStock = {
    id: 'q1',
    productId: 'p1',
    product: {
      id: 'p1',
      internalCode: 'P-001',
      name: 'Ibuprofeno 400mg',
      baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
    },
    quantityBase: 25.5,
    reason: 'Empaque roto',
    status: QuarantineStatus.EN_CUARENTENA,
    entryActorId: 'a1',
    entryActor: { id: 'a1', name: 'Admin', email: 'admin@erp.com' },
    entryMovementId: 'mov1',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
  };

  const mockItemResolved: IQuarantineStock = {
    id: 'q2',
    productId: 'p2',
    product: {
      id: 'p2',
      internalCode: 'P-002',
      name: 'Paracetamol 500mg',
      baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
    },
    quantityBase: 10,
    reason: 'Vencimiento próximo',
    status: QuarantineStatus.MERMA_CONFIRMADA,
    entryActorId: 'a1',
    entryActor: { id: 'a1', name: 'Admin', email: 'admin@erp.com' },
    entryMovementId: 'mov2',
    resolvedByActorId: 'a1',
    resolvedByActor: { id: 'a1', name: 'Admin', email: 'admin@erp.com' },
    resolutionNotes: 'Destruido conforme protocolo',
    resolvedAt: '2026-08-24T12:00:00.000Z',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T12:00:00.000Z',
  };

  it('renders loading state', () => {
    render(
      <QuarantineTable
        items={[]}
        isLoading={true}
        isError={false}
        onRetry={vi.fn()}
        onOpenResolve={vi.fn()}
      />,
    );
    expect(screen.getByTestId('quarantine-loading-state')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(
      <QuarantineTable
        items={[]}
        isLoading={false}
        isError={true}
        errorMessage="Error de red"
        onRetry={onRetry}
        onOpenResolve={vi.fn()}
      />,
    );
    expect(screen.getByTestId('quarantine-error-state')).toBeInTheDocument();
    expect(screen.getByText('Error de red')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Reintentar/i));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when no items', () => {
    render(
      <QuarantineTable
        items={[]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onOpenResolve={vi.fn()}
      />,
    );
    expect(screen.getByTestId('quarantine-empty-state')).toBeInTheDocument();
  });

  it('renders items with action button for EN_CUARENTENA', () => {
    const onOpenResolve = vi.fn();
    render(
      <QuarantineTable
        items={[mockItemPending, mockItemResolved]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onOpenResolve={onOpenResolve}
      />,
    );

    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();

    const resolveBtn = screen.getByTestId('quarantine-resolve-btn-q1');
    expect(resolveBtn).toBeInTheDocument();

    fireEvent.click(resolveBtn);
    expect(onOpenResolve).toHaveBeenCalledWith(mockItemPending);

    // Resolved item should not have action button
    expect(screen.queryByTestId('quarantine-resolve-btn-q2')).not.toBeInTheDocument();
    expect(screen.getByText('Destruido conforme protocolo')).toBeInTheDocument();
  });
});

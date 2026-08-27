import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PendingReceiptSelector } from './PendingReceiptSelector';
import { pendingReceiptFixture } from '../testing/supplier-invoice-fixtures';

vi.mock('../hooks/use-supplier-invoices', () => ({
  usePendingInvoiceReceiptsQuery: () => ({
    data: {
      data: [pendingReceiptFixture],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/suppliers/hooks/use-suppliers-query', () => ({
  useSuppliersQuery: () => ({ data: { data: [pendingReceiptFixture.supplier] } }),
}));

describe('PendingReceiptSelector', () => {
  it('shows traceability data and selects the requested receipt', async () => {
    const onSelect = vi.fn();
    render(<PendingReceiptSelector onSelect={onSelect} />);
    expect(screen.getByText('REC-000001')).toBeInTheDocument();
    expect(screen.getAllByText('Proveedor Médico')).toHaveLength(2);
    expect(screen.getByText('OC-000001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar' }));
    expect(onSelect).toHaveBeenCalledWith(pendingReceiptFixture);
  });
});

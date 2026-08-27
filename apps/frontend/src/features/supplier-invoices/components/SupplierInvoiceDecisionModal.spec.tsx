import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SupplierInvoiceDecisionModal } from './SupplierInvoiceDecisionModal';

const defaults = {
  invoiceNumber: 'A-0001',
  reason: '',
  onReasonChange: vi.fn(),
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  pending: false,
};

describe('SupplierInvoiceDecisionModal', () => {
  it('requires a valid reason before rejecting', async () => {
    const user = userEvent.setup();
    const onReasonChange = vi.fn();
    const { rerender } = render(
      <SupplierInvoiceDecisionModal {...defaults} mode="reject" onReasonChange={onReasonChange} />,
    );
    expect(screen.getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo del rechazo'), 'No coincide');
    expect(onReasonChange).toHaveBeenCalled();
    rerender(
      <SupplierInvoiceDecisionModal
        {...defaults}
        mode="reject"
        reason="No coincide"
        onReasonChange={onReasonChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirmar rechazo' })).toBeEnabled();
  });

  it('requires explicit confirmation to authorize', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SupplierInvoiceDecisionModal {...defaults} mode="authorize" onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Confirmar autorización' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

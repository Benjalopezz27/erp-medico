import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseToleranceSettings } from './PurchaseToleranceSettings';

const mutateAsync = vi.fn();
vi.mock('../hooks/use-purchase-settings', () => ({
  usePurchaseSettingsQuery: () => ({
    data: {
      costTolerancePercentage: '5.0000',
      updatedAt: '2026-08-27T12:00:00.000Z',
      updatedBy: { id: 'admin', name: 'Administradora', email: 'admin@erp.com' },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdatePurchaseSettingsMutation: () => ({ mutateAsync, isPending: false }),
}));

describe('PurchaseToleranceSettings', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({
      costTolerancePercentage: '4.2500',
      updatedAt: '2026-08-27T13:00:00.000Z',
      updatedBy: { id: 'admin', name: 'Administradora', email: 'admin@erp.com' },
    });
  });

  it('validates, confirms and persists the new tolerance', async () => {
    const user = userEvent.setup();
    render(<PurchaseToleranceSettings />);
    const input = screen.getByLabelText('Porcentaje de tolerancia');
    expect(input).toHaveValue('5.0000');
    expect(screen.getByRole('button', { name: 'Guardar tolerancia' })).toBeDisabled();

    await user.clear(input);
    await user.type(input, '4.25');
    await user.click(screen.getByRole('button', { name: 'Guardar tolerancia' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('5.0000%');
    expect(screen.getByRole('dialog')).toHaveTextContent('4.2500%');
    await user.click(screen.getByRole('button', { name: 'Confirmar cambio' }));

    expect(mutateAsync).toHaveBeenCalledWith({ costTolerancePercentage: '4.2500' });
    expect(await screen.findByRole('status')).toHaveTextContent('Administradora');
  });

  it('rejects values outside the allowed range', async () => {
    const user = userEvent.setup();
    render(<PurchaseToleranceSettings />);
    const input = screen.getByLabelText('Porcentaje de tolerancia');
    await user.clear(input);
    await user.type(input, '100.0001');
    expect(screen.getByText('La tolerancia debe estar entre 0 y 100%.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar tolerancia' })).toBeDisabled();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaxCondition } from '@erp/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemConfigForm } from './SystemConfigForm';

const mutateAsync = vi.fn();
// Referencia estable, como la devuelve react-query entre renders.
const data = {
  issuerRazonSocial: 'Distribuidora Sur SA',
  issuerCuit: '20123456786',
  issuerTaxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  arcaPuntoVenta: 1,
  operatingCurrency: 'ARS',
} as const;
vi.mock('../hooks/use-system-config', () => ({
  useSystemConfigQuery: () => ({
    data,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateSystemConfigMutation: () => ({ mutateAsync, isPending: false }),
}));

describe('SystemConfigForm', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
  });

  it('shows current values and the WSFE notice', () => {
    render(<SystemConfigForm />);
    expect(screen.getByLabelText('CUIT del emisor')).toHaveValue('20123456786');
    expect(screen.getByText(/siguen usando la configuración del servidor/)).toBeInTheDocument();
  });

  it('saves only the changed fields', async () => {
    const user = userEvent.setup();
    render(<SystemConfigForm />);
    const pv = screen.getByLabelText('Punto de venta ARCA');
    await user.clear(pv);
    await user.type(pv, '7');
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(mutateAsync).toHaveBeenCalledWith({ arcaPuntoVenta: 7 });
    expect(await screen.findByRole('status')).toHaveTextContent('Configuración guardada');
  });

  it('blocks an invalid CUIT without calling the API', async () => {
    const user = userEvent.setup();
    render(<SystemConfigForm />);
    const cuit = screen.getByLabelText('CUIT del emisor');
    await user.clear(cuit);
    await user.type(cuit, '20123456787');
    await user.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(screen.getByText(/El CUIT no es válido/)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

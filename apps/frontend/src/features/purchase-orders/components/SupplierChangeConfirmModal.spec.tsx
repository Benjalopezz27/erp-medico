import { render, screen, fireEvent } from '@testing-library/react';
import { SupplierChangeConfirmModal } from './SupplierChangeConfirmModal';

describe('SupplierChangeConfirmModal', () => {
  it('renders confirmation text and buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<SupplierChangeConfirmModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByText('¿Cambiar proveedor de la orden?')).toBeInTheDocument();
    expect(screen.getByText(/se eliminarán todas las líneas de productos/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Conservar proveedor actual' }));
    expect(onCancel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y limpiar líneas' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

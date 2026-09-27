import { Package } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title, description and icon', () => {
    render(
      <EmptyState
        icon={Package}
        title="No se encontraron productos"
        description="No hay productos que coincidan con los filtros seleccionados."
      />,
    );

    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
    expect(
      screen.getByText('No hay productos que coincidan con los filtros seleccionados.'),
    ).toBeInTheDocument();
  });

  it('renders without a description or icon', () => {
    render(<EmptyState title="Sin resultados" />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});

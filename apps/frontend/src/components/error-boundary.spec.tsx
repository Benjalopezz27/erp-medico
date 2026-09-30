import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('contains a render error and offers a reload action instead of crashing the tree', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(screen.getByRole('button', { name: 'Recargar página' })).toBeInTheDocument();
  });

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>Contenido normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Contenido normal')).toBeInTheDocument();
  });
});

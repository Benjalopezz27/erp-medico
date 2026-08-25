import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuarantineStatusBadge } from './QuarantineStatusBadge';
import { QuarantineStatus } from '../../types/quarantine.types';

describe('QuarantineStatusBadge Component', () => {
  it('renders EN CUARENTENA badge', () => {
    render(<QuarantineStatusBadge status={QuarantineStatus.EN_CUARENTENA} />);
    expect(screen.getByTestId('quarantine-status-badge-pending')).toBeInTheDocument();
    expect(screen.getByText(/EN CUARENTENA/i)).toBeInTheDocument();
  });

  it('renders MERMA CONFIRMADA badge', () => {
    render(<QuarantineStatusBadge status={QuarantineStatus.MERMA_CONFIRMADA} />);
    expect(screen.getByTestId('quarantine-status-badge-merma')).toBeInTheDocument();
    expect(screen.getByText(/MERMA CONFIRMADA/i)).toBeInTheDocument();
  });

  it('renders DEVUELTO A PROVEEDOR badge', () => {
    render(<QuarantineStatusBadge status={QuarantineStatus.DEVOLUCION_PROVEEDOR} />);
    expect(screen.getByTestId('quarantine-status-badge-devolucion')).toBeInTheDocument();
    expect(screen.getByText(/DEVUELTO A PROVEEDOR/i)).toBeInTheDocument();
  });

  it('renders REINGRESADO A STOCK badge', () => {
    render(<QuarantineStatusBadge status={QuarantineStatus.REINGRESADO_STOCK} />);
    expect(screen.getByTestId('quarantine-status-badge-reingreso')).toBeInTheDocument();
    expect(screen.getByText(/REINGRESADO A STOCK/i)).toBeInTheDocument();
  });
});

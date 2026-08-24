import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockStatusBadge } from './StockStatusBadge';
import { StockStatus } from '../types/stock.types';

describe('StockStatusBadge Component', () => {
  it('renders CRITICAL badge with correct text and attributes', () => {
    render(<StockStatusBadge status={StockStatus.CRITICAL} />);
    expect(screen.getByTestId('stock-status-critical')).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('renders LOW badge with correct text and attributes', () => {
    render(<StockStatusBadge status={StockStatus.LOW} />);
    expect(screen.getByTestId('stock-status-low')).toBeInTheDocument();
    expect(screen.getByText('Bajo')).toBeInTheDocument();
  });

  it('renders NORMAL badge with correct text and attributes', () => {
    render(<StockStatusBadge status={StockStatus.NORMAL} />);
    expect(screen.getByTestId('stock-status-normal')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });
});

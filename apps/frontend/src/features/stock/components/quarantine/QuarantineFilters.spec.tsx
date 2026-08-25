import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuarantineFilters } from './QuarantineFilters';
import { QuarantineStatus } from '../../types/quarantine.types';

describe('QuarantineFilters Component', () => {
  it('calls onFilterChange with debounced search term', async () => {
    const onFilterChange = vi.fn();
    const onResetFilters = vi.fn();

    render(
      <QuarantineFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />,
    );

    const input = screen.getByTestId('quarantine-search-input');
    fireEvent.change(input, { target: { value: 'Amoxicilina' } });

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        search: 'Amoxicilina',
        page: 1,
      });
    });
  });

  it('calls onFilterChange immediately when status is selected', () => {
    const onFilterChange = vi.fn();
    const onResetFilters = vi.fn();

    render(
      <QuarantineFilters
        filters={{ page: 1, limit: 10 }}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />,
    );

    const select = screen.getByTestId('quarantine-status-select');
    fireEvent.change(select, {
      target: { value: QuarantineStatus.EN_CUARENTENA },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      status: QuarantineStatus.EN_CUARENTENA,
      page: 1,
    });
  });

  it('renders reset button when filters are active and triggers onResetFilters', () => {
    const onFilterChange = vi.fn();
    const onResetFilters = vi.fn();

    render(
      <QuarantineFilters
        filters={{ page: 1, limit: 10, status: QuarantineStatus.EN_CUARENTENA }}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />,
    );

    const resetBtn = screen.getByTestId('quarantine-reset-filters-btn');
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});

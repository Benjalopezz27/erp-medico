import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ProductSearchInput } from './ProductSearchInput';
import * as productsApi from '../api/products.api';
import type { IProductSummary } from '../types/products.types';

vi.mock('../api/products.api');

describe('ProductSearchInput', () => {
  let queryClient: QueryClient;

  const mockProduct1: IProductSummary = {
    id: 'p-1',
    internalCode: 'P0001',
    name: 'Ibuprofeno 400mg',
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u' },
    currentStock: null,
    activePriceNet: 1200,
  };

  const mockProduct2: IProductSummary = {
    id: 'p-2',
    internalCode: 'P0002',
    name: 'Paracetamol 500mg',
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u' },
    currentStock: 0,
    activePriceNet: 800,
  };

  const mockProduct3: IProductSummary = {
    id: 'p-3',
    internalCode: 'P0003',
    name: 'Amoxicilina 500mg',
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u' },
    currentStock: 150,
    activePriceNet: 2500,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ProductSearchInput>> = {},
  ) => {
    const handleSelect = vi.fn();
    const utils = render(
      <QueryClientProvider client={queryClient}>
        <ProductSearchInput onSelect={handleSelect} {...props} />
      </QueryClientProvider>,
    );
    return { ...utils, handleSelect };
  };

  it('renders input with placeholder and search icon', () => {
    renderComponent({ placeholder: 'Buscar productos...' });
    expect(screen.getByPlaceholderText('Buscar productos...')).toBeInTheDocument();
  });

  it('debounces user typing by 300 ms before triggering typeahead query', async () => {
    vi.useFakeTimers();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([mockProduct1]);

    renderComponent();
    const input = screen.getByRole('combobox');

    // Simulate typing
    act(() => {
      input.focus();
    });
    await act(async () => {
      (input as HTMLInputElement).value = 'Ibu';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Before 300ms, no API call
    expect(productsApi.searchProductsTypeaheadApi).not.toHaveBeenCalled();

    // Fast-forward 300ms
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();
  });

  it('displays distinct stock badges for null, zero, and positive numbers', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([
      mockProduct1, // null stock
      mockProduct2, // 0 stock
      mockProduct3, // 150 stock
    ]);

    renderComponent();
    const input = screen.getByRole('combobox');
    await user.type(input, 'Med');

    await waitFor(() => {
      expect(screen.getByText('Stock: Sin datos')).toBeInTheDocument();
      expect(screen.getByText('Sin stock (0)')).toBeInTheDocument();
      expect(screen.getByText('150 u')).toBeInTheDocument();
    });
  });

  it('selects product and displays internalCode and name in input', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([mockProduct1]);

    const { handleSelect } = renderComponent();
    const input = screen.getByRole('combobox');
    await user.type(input, 'Ibu');

    await waitFor(() => {
      expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    });

    const option = screen.getByText('Ibuprofeno 400mg');
    await user.click(option);

    expect(handleSelect).toHaveBeenCalledWith(mockProduct1);
    expect(input).toHaveValue('P0001 - Ibuprofeno 400mg');
  });

  it('clears selection when clicking clear X button', async () => {
    const user = userEvent.setup();
    const { handleSelect } = renderComponent({ value: mockProduct1 });

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('P0001 - Ibuprofeno 400mg');

    const clearBtn = screen.getByLabelText('Limpiar búsqueda');
    await user.click(clearBtn);

    expect(handleSelect).toHaveBeenCalledWith(null);
    expect(input).toHaveValue('');
  });

  it('supports keyboard navigation with ArrowDown, ArrowUp, and Enter', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([
      mockProduct1,
      mockProduct2,
    ]);

    const { handleSelect } = renderComponent();
    const input = screen.getByRole('combobox');
    await user.type(input, 'Med');

    await waitFor(() => {
      expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    });

    // Arrow down to first item, then arrow down to second, then Enter
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(handleSelect).toHaveBeenCalledWith(mockProduct2);
    expect(input).toHaveValue('P0002 - Paracetamol 500mg');
  });

  it('renders empty state when no results match', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([]);

    renderComponent();
    const input = screen.getByRole('combobox');
    await user.type(input, 'NonExistent');

    await waitFor(() => {
      expect(screen.getByText('No se encontraron productos activos')).toBeInTheDocument();
    });
  });
});

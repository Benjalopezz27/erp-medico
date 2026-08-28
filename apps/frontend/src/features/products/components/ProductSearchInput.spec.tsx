import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

    try {
      renderComponent();
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'Ibu' } });
      expect(productsApi.searchProductsTypeaheadApi).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(productsApi.searchProductsTypeaheadApi).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(productsApi.searchProductsTypeaheadApi).toHaveBeenCalledWith(
        { q: 'Ibu', limit: 10 },
        expect.any(AbortSignal),
      );
    } finally {
      vi.useRealTimers();
    }
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

  it('clears the selected value when the user edits its label', async () => {
    const user = userEvent.setup();
    const { handleSelect } = renderComponent({ value: mockProduct1 });

    await user.type(screen.getByRole('combobox'), ' extra');

    expect(handleSelect).toHaveBeenCalledWith(null);
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

  it('excludes configured product ids and explains how to recover', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValue([mockProduct1]);
    renderComponent({ excludeIds: ['p-1'] });
    await user.type(screen.getByRole('combobox'), 'Ibu');
    expect(
      await screen.findByText('Los resultados ya tienen una excepción configurada'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Refine la búsqueda para encontrar otro producto.'),
    ).toBeInTheDocument();
  });
});

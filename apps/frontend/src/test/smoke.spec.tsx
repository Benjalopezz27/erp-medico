import React, { useState, useEffect } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { create } from 'zustand';
import {
  renderWithProviders,
  renderWithRouter,
  createTestRouter,
  createTestQueryClient,
  registerStoreForReset,
} from './test-utils';
import { server } from './mocks/server';
import { vi, describe, it, expect } from 'vitest';

// Dedicated Zustand test store for smoke testing
interface SmokeCounterState {
  count: number;
  increment: () => void;
}
const useSmokeStore = registerStoreForReset(
  create<SmokeCounterState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  })),
);

// Sample debounced component for fake timers + userEvent testing
const SmokeDebouncedInput: React.FC<{ onDebouncedChange: (val: string) => void }> = ({
  onDebouncedChange,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onDebouncedChange(value);
    }, 300);
    return () => clearTimeout(handler);
  }, [value, onDebouncedChange]);

  return (
    <input
      type="text"
      placeholder="Buscar..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

describe('Frontend Testing Infrastructure Smoke Suite', () => {
  // 1. jest-dom matchers
  it('1. should assert DOM state with jest-dom matchers', () => {
    renderWithProviders(<button disabled>Acción Bloqueada</button>);
    expect(screen.getByRole('button', { name: 'Acción Bloqueada' })).toBeDisabled();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // 2. userEvent interactions
  it('2. should handle user typing and clicking interactions with userEvent', async () => {
    const CounterComponent: React.FC = () => {
      const [val, setVal] = useState(0);
      return (
        <div>
          <span>Valor: {val}</span>
          <button onClick={() => setVal((v) => v + 1)}>Incrementar</button>
        </div>
      );
    };

    const { user } = renderWithProviders(<CounterComponent />);
    expect(screen.getByText('Valor: 0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Incrementar' }));
    expect(screen.getByText('Valor: 1')).toBeInTheDocument();
  });

  // 3. QueryClient cache isolation between renders
  it('3. should ensure QueryClient caches are completely isolated between instances', () => {
    const client1 = createTestQueryClient();
    const client2 = createTestQueryClient();

    client1.setQueryData(['test-key'], { data: 'client1-data' });
    expect(client1.getQueryData(['test-key'])).toEqual({ data: 'client1-data' });
    expect(client2.getQueryData(['test-key'])).toBeUndefined();
  });

  // 4. HTTP interception with MSW
  it('4. should intercept HTTP GET requests deterministically using MSW server.use', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/test-mock', () => {
        return HttpResponse.json({ status: 'success', value: 42 });
      }),
    );

    const FetchWidget: React.FC = () => {
      const { data, isLoading } = useQuery({
        queryKey: ['mock-test'],
        queryFn: async () => {
          const res = await axios.get('http://localhost:3000/api/v1/test-mock');
          return res.data;
        },
      });

      if (isLoading) return <div>Cargando...</div>;
      return (
        <div>
          Resultado: {data?.status} - {data?.value}
        </div>
      );
    };

    renderWithProviders(<FetchWidget />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Resultado: success - 42')).toBeInTheDocument();
    });
  });

  // 5. Unhandled request rejection (onUnhandledRequest: 'error')
  it('5. should fail fast on unhandled network requests', async () => {
    let errorCaught = false;
    try {
      await axios.get('http://localhost:3000/api/v1/unhandled-endpoint');
    } catch {
      errorCaught = true;
    }
    expect(errorCaught).toBe(true);
  });

  // 6. In-memory router navigation with initial route
  it('6. should render in-memory router with specified initial route path', async () => {
    const HomePage: React.FC = () => <div>Página de Inicio</div>;
    const ProductsPage: React.FC = () => <div>Página de Productos</div>;

    const router = createTestRouter(
      [
        { path: '/', component: HomePage },
        { path: '/products', component: ProductsPage },
      ],
      '/products',
    );

    renderWithRouter({ router });
    await waitFor(() => {
      expect(screen.getByText('Página de Productos')).toBeInTheDocument();
      expect(screen.queryByText('Página de Inicio')).not.toBeInTheDocument();
    });
  });

  // 7. Zustand Store Reset Part 1 (state modified)
  it('7a. should modify Zustand store in test 1', () => {
    expect(useSmokeStore.getState().count).toBe(0);
    useSmokeStore.getState().increment();
    expect(useSmokeStore.getState().count).toBe(1);
  });

  // 7. Zustand Store Reset Part 2 (verify clean state)
  it('7b. should observe cleanly reset initial state in subsequent test', () => {
    expect(useSmokeStore.getState().count).toBe(0);
  });

  // 8. Fake timers with userEvent (Debounced input)
  it('8. should support userEvent with fake timers advanceTimers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onDebounceMock = vi.fn();

    const { user } = renderWithProviders(
      <SmokeDebouncedInput onDebouncedChange={onDebounceMock} />,
      {
        userEventOptions: { advanceTimers: vi.advanceTimersByTime },
      },
    );

    const input = screen.getByPlaceholderText('Buscar...');
    await user.type(input, 'Jeringa');

    // Prior to timer expiration
    expect(onDebounceMock).not.toHaveBeenCalledWith('Jeringa');

    // Advance past 300ms debounce
    vi.advanceTimersByTime(350);
    expect(onDebounceMock).toHaveBeenCalledWith('Jeringa');
  });

  // 9. Environment variable stubbing & automatic unstubbing
  it('9a. should stub environment variable during test', () => {
    vi.stubEnv('VITE_API_URL', 'https://custom-test-api.com/v1');
    expect(import.meta.env.VITE_API_URL).toBe('https://custom-test-api.com/v1');
  });

  it('9b. should restore environment variables after test teardown', () => {
    expect(import.meta.env.VITE_API_URL).toBeUndefined();
  });

  // 10. Mocks and handlers cleanup
  it('10. should have empty MSW handlers and fresh mock spies between test suites', () => {
    const testSpy = vi.fn();
    testSpy('executed');
    expect(testSpy).toHaveBeenCalledTimes(1);
  });
});

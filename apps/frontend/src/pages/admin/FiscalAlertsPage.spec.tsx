import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ArcaStatus } from '@erp/shared-types';
import { FiscalAlertsPage } from './FiscalAlertsPage';
import { renderWithProviders } from '@/test/test-utils';
import * as routerModule from '@tanstack/react-router';
import * as fiscalAlertsHook from '@/features/fiscal-alerts/hooks/use-fiscal-alerts-query';
import { buildFiscalAlertRow } from '@/features/fiscal-alerts/testing/fiscal-alerts-fixtures';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/features/fiscal-alerts/hooks/use-fiscal-alerts-query', () => ({
  useFiscalAlertsQuery: vi.fn(),
}));

describe('FiscalAlertsPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(routerModule.useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(routerModule.useSearch).mockReturnValue({
      tab: 'PENDIENTE_FACTURACION',
      page: 1,
      limit: 20,
    });
  });

  it('renders pending documents with operational data', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [buildFiscalAlertRow()],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    expect(screen.getByText('Alertas Fiscales')).toBeInTheDocument();
    expect(screen.getByText('V-00101')).toBeInTheDocument();
    expect(screen.getByText('Hospital Norte')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('renders rejected documents without the retry action when not retryable', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [
          buildFiscalAlertRow({
            id: 'f2',
            arcaStatus: ArcaStatus.RECHAZADO,
            isRetryable: false,
            arcaErrorMessage: 'CUIT inválido o inactivo.',
          }),
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('CUIT inválido o inactivo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('does not offer retry when a retry job is already active', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [buildFiscalAlertRow({ hasActiveRetryJob: true })],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('shows an accessible empty state', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    expect(
      screen.getByText('No hay comprobantes pendientes ni rechazados con los filtros aplicados.'),
    ).toBeInTheDocument();
  });

  it('shows an accessible loading state', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    expect(screen.getByLabelText('Cargando alertas fiscales')).toBeInTheDocument();
  });

  it('shows an accessible error state with a retry action', () => {
    const refetch = vi.fn();
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      error: new Error('network error'),
      refetch,
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('changes tab and resets page via navigate when filters change', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    fireEvent.click(screen.getByRole('tab', { name: /rechazados/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/admin/fiscal-alerts' }),
    );
  });

  it('opens the retry confirmation dialog for a retryable document', () => {
    vi.mocked(fiscalAlertsHook.useFiscalAlertsQuery).mockReturnValue({
      data: {
        data: [buildFiscalAlertRow()],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<FiscalAlertsPage />);

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(screen.getByRole('dialog', { name: /reintentar emisión fiscal/i })).toBeInTheDocument();
    expect(
      screen.getByText(/primero se consultará el estado del comprobante/i),
    ).toBeInTheDocument();
  });
});

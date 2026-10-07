import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IOnboardingStatus } from '@erp/shared-types';
import { OnboardingWizard } from './OnboardingWizard';

const skipMutate = vi.fn();
const completeAsync = vi.fn().mockResolvedValue({});
let status: IOnboardingStatus;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock('@/features/system-config/components/SystemConfigForm', () => ({
  SystemConfigForm: () => <div>form-fiscal</div>,
}));
vi.mock('../hooks/use-onboarding', () => ({
  useOnboardingStatusQuery: () => ({ data: status, isError: false, refetch: vi.fn() }),
  useSkipStepMutation: () => ({ mutate: skipMutate, isPending: false }),
  useCompleteOnboardingMutation: () => ({ mutateAsync: completeAsync, isPending: false }),
  useArcaCertificateQuery: () => ({ data: { hasCertificate: false }, isLoading: false }),
}));

const make = (states: Record<string, 'done' | 'skipped' | 'pending'>): IOnboardingStatus => {
  const ids = ['fiscal', 'users', 'catalog-base', 'products', 'parties', 'treasury', 'stock'];
  const required = ['fiscal', 'users', 'catalog-base'];
  const steps = ids.map((id) => ({
    id,
    required: required.includes(id),
    state: states[id] ?? 'done',
  })) as IOnboardingStatus['steps'];
  return {
    completed: false,
    steps,
    pendingStep: steps.find((s) => s.state === 'pending')?.id ?? null,
  };
};

describe('OnboardingWizard', () => {
  beforeEach(() => {
    skipMutate.mockReset();
    completeAsync.mockClear();
  });

  it('abre en el paso pendiente fiscal y avisa que el certificado no se sube', () => {
    status = make({ fiscal: 'pending' });
    render(<OnboardingWizard />);
    expect(screen.getByText('form-fiscal')).toBeInTheDocument();
    expect(screen.getByText(/no desde esta pantalla/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar configuración' })).toBeDisabled();
  });

  it('permite omitir un paso opcional pendiente', async () => {
    status = make({ products: 'pending' });
    render(<OnboardingWizard />);
    await userEvent.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    expect(skipMutate).toHaveBeenCalledWith('products');
  });

  it('no ofrece omitir un paso obligatorio', () => {
    status = make({ users: 'pending' });
    render(<OnboardingWizard />);
    expect(screen.queryByRole('button', { name: 'Omitir por ahora' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ir a Usuarios' })).toBeInTheDocument();
  });

  it('finaliza cuando no queda nada pendiente', async () => {
    status = make({});
    render(<OnboardingWizard />);
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar configuración' }));
    expect(completeAsync).toHaveBeenCalled();
  });
});

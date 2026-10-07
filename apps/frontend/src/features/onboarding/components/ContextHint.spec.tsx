import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole, type IOnboardingStatus } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { ContextHint } from './ContextHint';

const base: IOnboardingStatus = { steps: [], dismissed: false, hintsDismissed: [] };
const Hint = () => <ContextHint id="products" title="Catálogo" text="Explicación" />;

function renderAs(role: UserRole, status: IOnboardingStatus = base) {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useAuthStore.getState().setSession({
    accessToken: 't',
    user: { id: 'u', name: 'Ana', email: 'a@b.c', role, isActive: true },
  });
  server.use(http.get('*/api/v1/config/onboarding-status', () => HttpResponse.json(status)));
  return renderWithRouter({
    router: createTestRouter([{ path: '/', component: Hint }] as never, '/'),
  });
}

describe('ContextHint', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('se muestra al admin y se descarta de forma persistente', async () => {
    let dismissed = false;
    server.use(
      http.post('*/api/v1/config/hints/products/dismiss', () => {
        dismissed = true;
        return HttpResponse.json({ ...base, hintsDismissed: ['products'] });
      }),
    );
    renderAs(UserRole.ADMINISTRADOR);
    await userEvent.click(await screen.findByRole('button', { name: 'Entendido' }));
    expect(dismissed).toBe(true);
    expect(screen.queryByText('Catálogo')).toBeNull();
  });

  it('no se muestra si ya fue descartado', async () => {
    renderAs(UserRole.ADMINISTRADOR, { ...base, hintsDismissed: ['products'] });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Catálogo')).toBeNull();
  });

  it('no se muestra a un vendedor', async () => {
    renderAs(UserRole.VENDEDOR);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Catálogo')).toBeNull();
  });
});

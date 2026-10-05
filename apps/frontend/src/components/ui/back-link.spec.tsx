import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { BackLink } from './back-link';

describe('BackLink', () => {
  it('links to the explicit fallback when there is no in-app history', async () => {
    const router = createTestRouter(
      [
        { path: '/detail', component: () => <BackLink to="/list">Volver al listado</BackLink> },
        { path: '/list', component: () => <p>Listado</p> },
      ] as never,
      '/detail',
    );
    const { user } = renderWithRouter({ router });
    const link = await screen.findByRole('link', { name: /volver al listado/i });
    expect(link).toHaveAttribute('href', '/list');
    await user.click(link);
    expect(await screen.findByText('Listado')).toBeInTheDocument();
  });

  it('goes back to the previous location (keeping its search) when history exists', async () => {
    const router = createTestRouter(
      [
        { path: '/list', component: () => <p>Listado</p> },
        { path: '/detail', component: () => <BackLink to="/other">Volver</BackLink> },
        { path: '/other', component: () => <p>Otro</p> },
      ] as never,
      '/list?page=3',
    );
    const { user } = renderWithRouter({ router });
    await screen.findByText('Listado');
    await router.navigate({ to: '/detail' as never });
    await user.click(await screen.findByRole('link', { name: /volver/i }));
    expect(await screen.findByText('Listado')).toBeInTheDocument();
    expect(router.state.location.search).toMatchObject({ page: 3 });
  });

  it('does not hijack modified clicks (open in new tab) when history exists', async () => {
    const router = createTestRouter(
      [
        { path: '/list', component: () => <p>Listado</p> },
        { path: '/detail', component: () => <BackLink to="/other">Volver</BackLink> },
        { path: '/other', component: () => <p>Otro</p> },
      ] as never,
      '/list',
    );
    const { user } = renderWithRouter({ router });
    await screen.findByText('Listado');
    await router.navigate({ to: '/detail' as never });
    const link = await screen.findByRole('link', { name: /volver/i });
    await user.keyboard('{Control>}');
    await user.click(link);
    await user.keyboard('{/Control}');
    expect(router.state.location.pathname).toBe('/detail');
  });
});

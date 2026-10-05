import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { TreasuryNavigationTabs } from './TreasuryNavigationTabs';

describe('TreasuryNavigationTabs', () => {
  it('links the three treasury sections and marks the active one', async () => {
    const router = createTestRouter(
      [{ path: '/treasury/checks', component: () => <TreasuryNavigationTabs active="checks" /> }],
      '/treasury/checks',
    );
    renderWithRouter({ router });

    expect(await screen.findByRole('link', { name: 'Cheques' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Caja diaria' })).toHaveAttribute(
      'href',
      '/treasury/cash-register',
    );
    expect(screen.getByRole('link', { name: 'Movimientos' })).toHaveAttribute('href', '/treasury');
  });
});

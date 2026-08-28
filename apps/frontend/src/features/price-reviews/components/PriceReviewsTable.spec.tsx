import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PriceReviewDecisionAction,
  PriceReviewStaleReason,
  PriceReviewStatus,
} from '@erp/shared-types';
import { buildPriceReview } from '../testing/price-review-fixtures';
import { PriceReviewsTable } from './PriceReviewsTable';

describe('PriceReviewsTable', () => {
  it('shows authoritative snapshots, current values and every allowed action', () => {
    render(
      <PriceReviewsTable
        reviews={[buildPriceReview()]}
        loading={false}
        hasFilters={false}
        onAction={vi.fn()}
        onFilterInvoice={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Jeringa 10 ml').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Activo al crear/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /Aprobar sugerido para Jeringa/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: /Mantener actual para Jeringa/ }).length,
    ).toBeGreaterThan(0);
  });

  it('does not offer misleading approval for a stale review', () => {
    render(
      <PriceReviewsTable
        reviews={[
          buildPriceReview({
            isStale: true,
            staleReasons: [PriceReviewStaleReason.ACTIVE_PRICE_CHANGED],
            allowedActions: [PriceReviewDecisionAction.REJECT, PriceReviewDecisionAction.POSTPONE],
          }),
        ]}
        loading={false}
        hasFilters={false}
        onAction={vi.fn()}
        onFilterInvoice={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Revisión obsoleta').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Aprobar sugerido/ })).not.toBeInTheDocument();
  });

  it('shows historical custom approval and no mutation actions for a resolved review', () => {
    render(
      <PriceReviewsTable
        reviews={[
          buildPriceReview({
            status: PriceReviewStatus.APROBADO,
            approvedPriceNet: '165.50',
            decisionAction: PriceReviewDecisionAction.APPROVE_CUSTOM,
            allowedActions: [],
          }),
        ]}
        loading={false}
        hasFilters={false}
        onAction={vi.fn()}
        onFilterInvoice={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Aprobado:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin acciones pendientes').length).toBeGreaterThan(0);
  });
});

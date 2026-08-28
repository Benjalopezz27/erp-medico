import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PriceReviewDecisionAction, PriceReviewErrorCode } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import { buildPriceReview } from '../testing/price-review-fixtures';
import { PriceReviewDecisionModal } from './PriceReviewDecisionModal';

const mutations = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  postpone: vi.fn(),
  reopen: vi.fn(),
  pending: false,
}));

vi.mock('../hooks/use-price-review-mutations', () => ({
  useApprovePriceReviewMutation: () => ({
    mutateAsync: mutations.approve,
    isPending: mutations.pending,
  }),
  useRejectPriceReviewMutation: () => ({
    mutateAsync: mutations.reject,
    isPending: mutations.pending,
  }),
  usePostponePriceReviewMutation: () => ({
    mutateAsync: mutations.postpone,
    isPending: mutations.pending,
  }),
  useReopenPriceReviewMutation: () => ({
    mutateAsync: mutations.reopen,
    isPending: mutations.pending,
  }),
}));

function renderModal(
  action: PriceReviewDecisionAction,
  callbacks = { onClose: vi.fn(), onSuccess: vi.fn(), onConflict: vi.fn() },
) {
  const result = renderWithProviders(
    <PriceReviewDecisionModal review={buildPriceReview()} action={action} {...callbacks} />,
  );
  return { ...result, ...callbacks };
}

describe('PriceReviewDecisionModal', () => {
  beforeEach(() => {
    mutations.pending = false;
    mutations.approve.mockReset();
    mutations.reject.mockReset();
    mutations.postpone.mockReset();
    mutations.reopen.mockReset();
  });

  it('submits a canonical custom price while preserving the historical suggestion', async () => {
    mutations.approve.mockResolvedValue(buildPriceReview());
    const { user } = renderModal(PriceReviewDecisionAction.APPROVE_CUSTOM);
    expect(screen.getByText('Sugerido histórico')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nuevo precio neto activo'), '165,5');
    await user.click(screen.getByRole('button', { name: 'Aplicar precio' }));
    expect(mutations.approve).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      payload: { mode: 'CUSTOM', customPriceNet: '165.50' },
    });
  });

  it('requires a reason to reject and communicates that the active price is unchanged', async () => {
    const { user } = renderModal(PriceReviewDecisionAction.REJECT);
    expect(
      screen.getByText('Esta acción no modifica el precio activo del producto.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rechazar propuesta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 3 caracteres');
    expect(mutations.reject).not.toHaveBeenCalled();
  });

  it('closes stale confirmation and reports an authoritative 409 conflict', async () => {
    mutations.approve.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: PriceReviewErrorCode.PRICE_REVIEW_STALE,
          details: {
            currentReview: buildPriceReview({ isStale: true }),
            currentProduct: buildPriceReview().product,
            supersededByReviewId: null,
          },
        },
      },
    });
    const callbacks = { onClose: vi.fn(), onSuccess: vi.fn(), onConflict: vi.fn() };
    const { user } = renderModal(PriceReviewDecisionAction.APPROVE_SUGGESTED, callbacks);
    await user.click(screen.getByRole('button', { name: 'Aprobar sugerido' }));
    expect(callbacks.onConflict).toHaveBeenCalledWith(expect.stringContaining('obsoleta'));
    expect(callbacks.onClose).toHaveBeenCalled();
    expect(callbacks.onSuccess).not.toHaveBeenCalled();
  });

  it('prevents closing and submitting while the decision is pending', () => {
    mutations.pending = true;
    renderModal(PriceReviewDecisionAction.POSTPONE);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Posponer' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cerrar modal' })).not.toBeInTheDocument();
  });
});

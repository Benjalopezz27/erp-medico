import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkupErrorCode, MarkupLevel } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import { MarkupFormModal } from './MarkupFormModal';

const create = vi.fn();
const update = vi.fn();
const mutationState = vi.hoisted(() => ({ pending: false }));
vi.mock('../hooks/use-markup-mutations', () => ({
  useCreateMarkupMutation: () => ({ mutateAsync: create, isPending: mutationState.pending }),
  useUpdateMarkupMutation: () => ({ mutateAsync: update, isPending: mutationState.pending }),
}));
vi.mock('@/features/products/components/ProductSearchInput', () => ({
  ProductSearchInput: () => <div>Selector de producto</div>,
}));

const globalRule = {
  id: 'global-1',
  level: MarkupLevel.GLOBAL,
  percentage: '15.0000',
  categoryId: null,
  categoryName: null,
  productId: null,
  productCode: null,
  productName: null,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('MarkupFormModal', () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    mutationState.pending = false;
  });

  it('prevents closing or submitting while a mutation is pending', () => {
    mutationState.pending = true;
    renderWithProviders(
      <MarkupFormModal
        isOpen
        level={MarkupLevel.GLOBAL}
        configuration={globalRule}
        configurations={[globalRule]}
        categories={[]}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('excludes configured categories and submits a canonical string', async () => {
    create.mockResolvedValue({});
    const onClose = vi.fn();
    const { user } = renderWithProviders(
      <MarkupFormModal
        isOpen
        level={MarkupLevel.CATEGORY}
        configurations={[
          {
            ...globalRule,
            id: 'category-rule',
            level: MarkupLevel.CATEGORY,
            categoryId: 'category-used',
            categoryName: 'Usada',
          },
        ]}
        categories={[
          { id: 'category-used', name: 'Usada', description: null, createdAt: '', updatedAt: '' },
          {
            id: 'category-free',
            name: 'Disponible',
            description: null,
            createdAt: '',
            updatedAt: '',
          },
        ]}
        onClose={onClose}
        onSuccess={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole('option', { name: 'Usada' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Categoría'), 'category-free');
    await user.type(screen.getByLabelText('Porcentaje de markup'), '25.5');
    await user.click(screen.getByRole('button', { name: 'Crear excepción' }));
    expect(create).toHaveBeenCalledWith({
      level: MarkupLevel.CATEGORY,
      percentage: '25.5000',
      categoryId: 'category-free',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('preserves the edited value on a concurrent 409 and offers authoritative refresh', async () => {
    update.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: MarkupErrorCode.MARKUP_ALREADY_EXISTS } },
    });
    const onClose = vi.fn();
    const onRefresh = vi.fn();
    const { user } = renderWithProviders(
      <MarkupFormModal
        isOpen
        level={MarkupLevel.GLOBAL}
        configuration={globalRule}
        configurations={[globalRule]}
        categories={[]}
        onClose={onClose}
        onSuccess={vi.fn()}
        onRefresh={onRefresh}
      />,
    );
    const input = screen.getByLabelText('Porcentaje de markup');
    await user.clear(input);
    await user.type(input, '20.25');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otro cambio creó una regla');
    expect(input).toHaveValue('20.25');
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Actualizar configuraciones' }));
    expect(onRefresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});

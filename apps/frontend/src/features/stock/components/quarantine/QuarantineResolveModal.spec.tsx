import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuarantineResolveModal } from './QuarantineResolveModal';
import * as quarantineHooks from '../../hooks/use-quarantine';
import {
  QuarantineStatus,
  QuarantineResolution,
  type IQuarantineStock,
} from '../../types/quarantine.types';

vi.mock('../../hooks/use-quarantine', () => ({
  useResolveQuarantineMutation: vi.fn(),
}));

describe('QuarantineResolveModal Component', () => {
  const mockMutate = vi.fn();
  const onClose = vi.fn();

  const mockItem: IQuarantineStock = {
    id: 'q-100',
    productId: 'p1',
    product: {
      id: 'p1',
      internalCode: 'P-001',
      name: 'Amoxicilina 500mg',
      baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
    },
    quantityBase: 15,
    reason: 'Empaque mojado',
    status: QuarantineStatus.EN_CUARENTENA,
    entryActorId: 'a1',
    entryActor: { id: 'a1', name: 'Admin', email: 'admin@erp.com' },
    entryMovementId: 'mov1',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quarantineHooks.useResolveQuarantineMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  it('renders nothing when closed or item is null', () => {
    const { container } = render(
      <QuarantineResolveModal isOpen={false} onClose={onClose} item={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('validates resolution notes and submits REINGRESO resolution', () => {
    render(<QuarantineResolveModal isOpen={true} onClose={onClose} item={mockItem} />);

    expect(screen.getByText('Amoxicilina 500mg')).toBeInTheDocument();
    expect(screen.getByText('15,00 cmp')).toBeInTheDocument();

    // Submit without notes
    fireEvent.submit(screen.getByTestId('quarantine-resolve-form'));
    expect(
      screen.getByText('Las notas de resolución son obligatorias (mínimo 3 caracteres).'),
    ).toBeInTheDocument();

    // Enter notes and submit REINGRESO (default)
    fireEvent.change(screen.getByTestId('quarantine-notes-input'), {
      target: { value: 'Mercadería apta tras inspección de calidad' },
    });
    fireEvent.submit(screen.getByTestId('quarantine-resolve-form'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: 'q-100',
        payload: {
          resolution: QuarantineResolution.REINGRESO,
          resolutionNotes: 'Mercadería apta tras inspección de calidad',
        },
      },
      expect.anything(),
    );
  });

  it('submits MERMA resolution when selected', () => {
    render(<QuarantineResolveModal isOpen={true} onClose={onClose} item={mockItem} />);

    // Select MERMA
    fireEvent.click(screen.getByTestId('quarantine-option-merma'));

    fireEvent.change(screen.getByTestId('quarantine-notes-input'), {
      target: { value: 'Destrucción por daño total' },
    });
    fireEvent.submit(screen.getByTestId('quarantine-resolve-form'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: 'q-100',
        payload: {
          resolution: QuarantineResolution.MERMA,
          resolutionNotes: 'Destrucción por daño total',
        },
      },
      expect.anything(),
    );
  });
});

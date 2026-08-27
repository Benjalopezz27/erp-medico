import { render, screen, fireEvent } from '@testing-library/react';
import { PurchaseOrderItemsTable } from './PurchaseOrderItemsTable';

describe('PurchaseOrderItemsTable', () => {
  const mockFields = [
    {
      id: 'field-1',
      supplierProductId: 'sp-1',
      productId: 'p-1',
      productInternalCode: 'MED-001',
      productName: 'Jeringa Descartable 5ml',
      supplierSku: 'JER-5ML',
      purchaseUnitName: 'Caja x 100',
      purchaseUnitSymbol: 'CJA',
      conversionFactorToBase: 100,
      baseUnitSymbol: 'UN',
      orderedQty: '10',
      expectedCostUnitNet: '1500',
    },
  ];

  const defaultProps = {
    fields: mockFields as any,
    remove: vi.fn(),
    register: vi.fn().mockReturnValue({}),
    watchItems: mockFields as any,
  };

  it('renders line item details and calculated base quantity', () => {
    render(<PurchaseOrderItemsTable {...defaultProps} />);

    expect(screen.getByText('Jeringa Descartable 5ml')).toBeInTheDocument();
    expect(screen.getByText(/Factor: 100/)).toBeInTheDocument();
    expect(screen.getByText(/= 1000 UN/)).toBeInTheDocument();
    expect(screen.getByTestId('purchase-order-total-net')).toHaveTextContent('$ 15.000,00');
  });

  it('renders deleted association error when isDeletedAssociation is true', () => {
    const fieldsWithDeleted = [
      {
        ...mockFields[0],
        isDeletedAssociation: true,
      },
    ];

    render(
      <PurchaseOrderItemsTable
        {...defaultProps}
        fields={fieldsWithDeleted as any}
        watchItems={fieldsWithDeleted as any}
      />,
    );

    expect(screen.getByText(/Este producto ya no existe en el catálogo/i)).toBeInTheDocument();
  });

  it('renders drift warning banner when driftWarning is present', () => {
    const fieldsWithDrift = [
      {
        ...mockFields[0],
        driftWarning: 'El factor de conversión cambió en el catálogo de 100 a 120.',
      },
    ];

    render(
      <PurchaseOrderItemsTable
        {...defaultProps}
        fields={fieldsWithDrift as any}
        watchItems={fieldsWithDrift as any}
      />,
    );

    expect(
      screen.getByText('El factor de conversión cambió en el catálogo de 100 a 120.'),
    ).toBeInTheDocument();
  });

  it('triggers remove when clicking delete button', () => {
    render(<PurchaseOrderItemsTable {...defaultProps} />);

    const deleteBtn = screen.getByLabelText('Eliminar ítem Jeringa Descartable 5ml');
    fireEvent.click(deleteBtn);

    expect(defaultProps.remove).toHaveBeenCalledWith(0);
  });
});

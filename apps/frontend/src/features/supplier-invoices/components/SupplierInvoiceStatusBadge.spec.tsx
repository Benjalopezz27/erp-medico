import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SupplierInvoiceStatus } from '../types/supplier-invoices.types';
import { SupplierInvoiceStatusBadge } from './SupplierInvoiceStatusBadge';

describe('SupplierInvoiceStatusBadge', () => {
  it.each(Object.values(SupplierInvoiceStatus))('renders status %s', (status) => {
    render(<SupplierInvoiceStatusBadge status={status} />);
    expect(screen.getByText(new RegExp(status, 'i'))).toBeInTheDocument();
  });
});

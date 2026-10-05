import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportTable } from './ReportTable';

const report = {
  columns: [
    { key: 'name', header: 'Nombre', type: 'text' },
    { key: 'total', header: 'Total', type: 'money' },
  ],
  rows: [
    { name: 'B', total: '100.00' },
    { name: 'A', total: '9.50' },
    { name: 'TOTAL', total: '109.50' },
  ],
} as never;

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.firstChild?.textContent);

describe('ReportTable sorting', () => {
  it('sorts money by value and keeps TOTAL last', () => {
    render(<ReportTable report={report} />);
    const btn = screen.getByRole('button', { name: /Total/ });
    fireEvent.click(btn);
    expect(names()).toEqual(['A', 'B', 'TOTAL']);
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    fireEvent.click(btn);
    expect(names()).toEqual(['B', 'A', 'TOTAL']);
    fireEvent.click(btn);
    expect(names()).toEqual(['B', 'A', 'TOTAL']);
  });
});

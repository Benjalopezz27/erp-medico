import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { nextSort, parseSort, useClientSort } from './sorting';

describe('nextSort', () => {
  it('cycles none → ASC → DESC → none and restarts on another column', () => {
    const asc = nextSort({}, 'name');
    expect(asc).toEqual({ sortBy: 'name', sortOrder: 'ASC' });
    const desc = nextSort(asc, 'name');
    expect(desc).toEqual({ sortBy: 'name', sortOrder: 'DESC' });
    expect(nextSort(desc, 'name')).toEqual({ sortBy: undefined, sortOrder: undefined });
    expect(nextSort(desc, 'total')).toEqual({ sortBy: 'total', sortOrder: 'ASC' });
  });
});

describe('parseSort', () => {
  const fields = ['name', 'total'] as const;
  it('keeps only whitelisted fields and normalizes the direction', () => {
    expect(parseSort({ sortBy: 'name', sortOrder: 'desc' }, fields)).toEqual({
      sortBy: 'name',
      sortOrder: 'DESC',
    });
    expect(parseSort({ sortBy: 'name' }, fields)).toEqual({ sortBy: 'name', sortOrder: 'ASC' });
    expect(parseSort({ sortBy: 'password', sortOrder: 'DESC' }, fields)).toEqual({});
  });
});

describe('useClientSort', () => {
  const rows = [
    { name: 'b', amount: 10 },
    { name: 'a', amount: 9 },
    { name: 'TOTAL', amount: 19 },
  ];
  const accessors = {
    name: (r: (typeof rows)[number]) => r.name,
    amount: (r: (typeof rows)[number]) => r.amount,
  };

  it('sorts numerically and keeps pinned rows last in both directions', () => {
    const { result } = renderHook(() => useClientSort(rows, accessors, (r) => r.name === 'TOTAL'));
    expect(result.current.sorted.map((r) => r.name)).toEqual(['b', 'a', 'TOTAL']);
    act(() => result.current.onSort('amount'));
    expect(result.current.sorted.map((r) => r.amount)).toEqual([9, 10, 19]);
    act(() => result.current.onSort('amount'));
    expect(result.current.sorted.map((r) => r.amount)).toEqual([10, 9, 19]);
    act(() => result.current.onSort('amount'));
    expect(result.current.sorted.map((r) => r.name)).toEqual(['b', 'a', 'TOTAL']);
  });
});

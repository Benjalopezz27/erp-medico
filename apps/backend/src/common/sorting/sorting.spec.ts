import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { resolveSort, SortableQuery } from './sorting';

const columns = { name: 'p.name', total: 'p.total' } as const;

class TestQuery extends SortableQuery(['name', 'total'] as const) {}

describe('resolveSort', () => {
  it('returns null without sortBy so the caller keeps its default order', () => {
    expect(resolveSort(columns, undefined, 'DESC')).toBeNull();
  });

  it('maps the key to its column; direction defaults to ASC and ignores case', () => {
    expect(resolveSort(columns, 'name', undefined)).toEqual({
      column: 'p.name',
      direction: 'ASC',
    });
    expect(resolveSort(columns, 'total', 'desc')).toEqual({
      column: 'p.total',
      direction: 'DESC',
    });
  });

  it('never resolves keys outside the whitelist', () => {
    expect(resolveSort(columns, 'password' as never, 'ASC')).toBeNull();
    expect(resolveSort(columns, 'toString' as never, 'ASC')).toBeNull();
  });
});

describe('SortableQuery', () => {
  const errors = (plain: object) =>
    validateSync(plainToInstance(TestQuery, plain));

  it('accepts whitelisted fields and both directions in any case', () => {
    expect(errors({})).toHaveLength(0);
    expect(errors({ sortBy: 'name', sortOrder: 'desc' })).toHaveLength(0);
  });

  it('rejects other fields and directions', () => {
    expect(errors({ sortBy: 'password' })).not.toHaveLength(0);
    expect(errors({ sortOrder: 'sideways' })).not.toHaveLength(0);
  });
});

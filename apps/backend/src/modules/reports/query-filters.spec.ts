import { BadRequestException } from '@nestjs/common';
import { WhereBuilder, oneOf, parseDate } from './query-filters';

describe('parseDate', () => {
  it('accepts real calendar dates and ignores empty', () => {
    expect(parseDate('2026-02-28', 'from')).toBe('2026-02-28');
    expect(parseDate(undefined, 'from')).toBeUndefined();
    expect(parseDate('', 'from')).toBeUndefined();
  });
  it.each(['2026-13-40', '2026-02-30', '01/02/2026', 'x'])(
    'rejects %s',
    (v) => {
      expect(() => parseDate(v, 'from')).toThrow(BadRequestException);
    },
  );
});

describe('oneOf', () => {
  it('returns allowed values and rejects others', () => {
    expect(oneOf('A', ['A', 'B'], 'status')).toBe('A');
    expect(oneOf(undefined, ['A'], 'status')).toBeUndefined();
    expect(() => oneOf('C', ['A', 'B'], 'status')).toThrow(BadRequestException);
  });
});

describe('WhereBuilder', () => {
  it('numbers parameters in order and joins with AND', () => {
    const w = new WhereBuilder()
      .add('a = ?', 1)
      .addIf('b = ?', undefined)
      .addIf('c = ?', 'x');
    expect(w.sql()).toBe('WHERE a = $1 AND c = $2');
    expect(w.params).toEqual([1, 'x']);
  });
  it('is empty without clauses', () => {
    expect(new WhereBuilder().sql()).toBe('');
  });
  it('builds an inclusive Argentine-day range for timestamps', () => {
    const w = new WhereBuilder().dateRange('s.created_at', {
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(w.sql()).toContain("AT TIME ZONE 'America/Argentina/Buenos_Aires'");
    expect(w.sql()).toContain('>= $1');
    expect(w.sql()).toContain('<= $2');
    expect(w.params).toEqual(['2026-10-01', '2026-10-31']);
  });
  it('compares plain date columns directly', () => {
    const w = new WhereBuilder().dateRange(
      'c.due_date',
      { from: '2026-10-01' },
      false,
    );
    expect(w.sql()).toBe('WHERE c.due_date >= $1');
  });
  it('rejects an invalid range date', () => {
    expect(() => new WhereBuilder().dateRange('x', { from: 'nope' })).toThrow(
      BadRequestException,
    );
  });
});

import { createSqlReport, SqlReportSpec } from './sql-report';

const spec: SqlReportSpec = {
  type: 't',
  title: 'T',
  columns: [
    { key: 'name', header: 'Nombre' },
    { key: 'amount', header: 'Monto', type: 'money' },
  ],
  totals: ['amount'],
  build: (f) => ({ sql: 'SELECT 1', params: [f.x] }),
};

describe('createSqlReport', () => {
  it('runs the built query and appends an exact TOTAL row', async () => {
    const query = jest.fn(async () => [
      { name: 'a', amount: '0.10' },
      { name: 'b', amount: '0.20' },
    ]);
    const report = await createSqlReport({ query } as any, spec).generate({
      x: '1',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1', ['1']);
    expect(report.rows[report.rows.length - 1]).toEqual({
      name: 'TOTAL',
      amount: '0.30',
    });
    expect(report.rows).toHaveLength(3);
    expect(report.title).toBe('T');
  });
  it('adds no total row when the spec has none or there are no rows', async () => {
    const query = jest.fn(async () => []);
    const withTotals = await createSqlReport({ query } as any, spec).generate(
      {},
    );
    expect(withTotals.rows).toEqual([]);
    const plain = await createSqlReport(
      { query: async () => [{ name: 'a', amount: '1' }] } as any,
      {
        ...spec,
        totals: undefined,
      },
    ).generate({});
    expect(plain.rows).toHaveLength(1);
  });
});

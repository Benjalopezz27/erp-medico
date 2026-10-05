import { BadRequestException } from '@nestjs/common';
import { REPORT_SPECS } from './index';

const spec = (type: string) => REPORT_SPECS.find((s) => s.type === type)!;
const UUID = '11111111-1111-4111-8111-111111111111';

describe('report specs', () => {
  it('registers the nine US-37..45 reports once each', () => {
    expect(REPORT_SPECS.map((s) => s.type).sort()).toEqual([
      'checks-portfolio',
      'collections',
      'profitability',
      'purchases',
      'receivables-aging',
      'sales',
      'stock-movements',
      'stock-valuation',
      'supplier-invoices',
    ]);
  });

  it('keeps every column key unique and totals within the columns', () => {
    for (const s of REPORT_SPECS) {
      const keys = s.columns.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const t of s.totals ?? []) expect(keys).toContain(t);
    }
  });

  it('never interpolates filters into the SQL', () => {
    const evil = "x'; DROP TABLE sales;--";
    for (const s of REPORT_SPECS) {
      try {
        const { sql } = s.build({
          status: evil,
          paymentMethod: evil,
          movementType: evil,
        });
        expect(sql).not.toContain('DROP TABLE');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    }
  });

  it('sales: confirmed sales plus date, customer and payment filters as parameters', () => {
    const { sql, params } = spec('sales').build({
      from: '2026-10-01',
      to: '2026-10-31',
      customerId: UUID,
      paymentMethod: 'EFECTIVO',
    });
    expect(params).toEqual([
      'CONFIRMADA',
      '2026-10-01',
      '2026-10-31',
      UUID,
      'EFECTIVO',
    ]);
    expect(sql).toContain('$5');
  });

  it('rejects malformed ids, dates and enum filters', () => {
    expect(() => spec('sales').build({ customerId: 'abc' })).toThrow(
      BadRequestException,
    );
    expect(() => spec('sales').build({ from: '2026-99-99' })).toThrow(
      BadRequestException,
    );
    expect(() => spec('sales').build({ paymentMethod: 'ORO' })).toThrow(
      BadRequestException,
    );
    expect(() => spec('checks-portfolio').build({ status: 'X' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      spec('supplier-invoices').build({ status: 'CONFIRMADA' }),
    ).toThrow(BadRequestException);
  });

  it('stock-valuation: below-minimum uses the same <= rule as the stock module', () => {
    expect(spec('stock-valuation').build({ belowMin: 'true' }).sql).toContain(
      '<= p.min_stock',
    );
    expect(spec('stock-valuation').build({}).sql).not.toContain(
      '<= p.min_stock',
    );
  });

  it('supplier-invoices and aging default to the pending statuses', () => {
    expect(spec('supplier-invoices').build({}).sql).toContain(
      "'OBSERVADA', 'AUTORIZADA'",
    );
    expect(spec('receivables-aging').build({}).sql).toContain(
      "'PENDIENTE', 'PARCIAL'",
    );
    expect(
      spec('receivables-aging').build({ status: 'PARCIAL' }).params,
    ).toEqual(['PARCIAL']);
  });

  it('checks-portfolio filters the due date as a plain date column', () => {
    const { sql, params } = spec('checks-portfolio').build({
      dueFrom: '2026-10-01',
    });
    expect(sql).toContain('k.due_date >= $1');
    expect(params).toEqual(['2026-10-01']);
  });
});

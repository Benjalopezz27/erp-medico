import { describe, expect, it } from 'vitest';
import { buildStatementFilename } from './receivables.format';

describe('buildStatementFilename', () => {
  it('uses the Argentine calendar day, not the UTC one', () => {
    expect(buildStatementFilename('30500010912', new Date('2026-09-29T00:30:00Z'))).toBe(
      'resumen-cuenta-30500010912-20260928.pdf',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { DebtorStatus } from '@erp/shared-types';
import { validateReceivablesSearchParams } from './receivables.schema';

describe('validateReceivablesSearchParams', () => {
  it('falls back to defaults on invalid input', () => {
    expect(
      validateReceivablesSearchParams({ page: '-3', limit: '7', status: 'X', search: '   ' }),
    ).toEqual({ page: 1, limit: 20, search: undefined, status: undefined });
  });

  it('keeps valid values and trims the search text', () => {
    expect(
      validateReceivablesSearchParams({
        page: '3',
        limit: '50',
        status: DebtorStatus.AL_DIA,
        search: ' farmacia ',
      }),
    ).toEqual({ page: 3, limit: 50, search: 'farmacia', status: DebtorStatus.AL_DIA });
  });
});

import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@erp/shared-types';
import { allowedCheckActions } from './check-actions';

describe('allowedCheckActions', () => {
  it.each([
    [CheckStatus.RECIBIDO, ['to-cartera']],
    [CheckStatus.EN_CARTERA, ['deposit', 'endorse', 'reject']],
    [CheckStatus.DEPOSITADO, ['reject']],
    [CheckStatus.ENDOSADO, []],
    [CheckStatus.RECHAZADO, []],
  ])('%s allows %j', (status, expected) => {
    expect(allowedCheckActions(status)).toEqual(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { MarkupErrorCode } from '@erp/shared-types';
import { parseMarkupError } from './markups.errors';

const axiosError = (status: number, code?: MarkupErrorCode, requestId?: string) => ({
  isAxiosError: true,
  response: { status, data: { code, requestId } },
});

describe('markup error mapping', () => {
  it.each([
    [404, MarkupErrorCode.MARKUP_NOT_FOUND],
    [409, MarkupErrorCode.MARKUP_ALREADY_EXISTS],
    [409, MarkupErrorCode.MARKUP_TARGET_INACTIVE],
  ])('marks authoritative recovery for HTTP %s / %s', (status, code) => {
    expect(parseMarkupError(axiosError(status, code))).toMatchObject({
      status,
      code,
      shouldRefresh: true,
    });
  });

  it('maps validation errors and preserves request traceability', () => {
    const parsed = parseMarkupError(
      axiosError(400, MarkupErrorCode.MARKUP_INVALID_PERCENTAGE, 'request-123'),
    );
    expect(parsed.shouldRefresh).toBe(false);
    expect(parsed.message).toContain('hasta 4 decimales');
    expect(parsed.message).toContain('request-123');
  });
});

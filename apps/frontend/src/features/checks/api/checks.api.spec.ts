import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { CheckStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { getCheckApi, getChecksApi, transitionCheckApi } from './checks.api';
import { CHECK_ID, buildCheck, buildCheckDetail, buildCheckList } from '../testing/checks-fixtures';

describe('checks API', () => {
  it('lists checks sending filters as query params', async () => {
    let url = '';
    server.use(
      http.get('*/api/v1/checks', ({ request }) => {
        url = request.url;
        return HttpResponse.json(buildCheckList());
      }),
    );
    await getChecksApi({ page: 1, limit: 20, status: CheckStatus.EN_CARTERA, dueTo: '2026-10-31' });
    expect(url).toContain('status=EN_CARTERA');
    expect(url).toContain('dueTo=2026-10-31');
  });

  it('gets the detail with the rejection impact', async () => {
    server.use(
      http.get(`*/api/v1/checks/${CHECK_ID}`, () => HttpResponse.json(buildCheckDetail())),
    );
    expect((await getCheckApi(CHECK_ID)).rejectionImpact?.totalIncrease).toBe('200.00');
  });

  it('patches the action endpoint with its body', async () => {
    let body: unknown;
    server.use(
      http.patch(`*/api/v1/checks/${CHECK_ID}/endorse`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildCheck({ status: CheckStatus.ENDOSADO }));
      }),
    );
    await transitionCheckApi(CHECK_ID, 'endorse', { supplierId: 's-1' });
    expect(body).toEqual({ supplierId: 's-1' });
  });
});

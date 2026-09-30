import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { DebtorStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import {
  downloadAccountStatementPdfApi,
  getCustomerAccountApi,
  getDebtorsApi,
} from './receivables.api';
import {
  CUSTOMER_ID,
  buildAccountResponse,
  buildDebtorsResponse,
} from '../testing/receivables-fixtures';

describe('receivables API', () => {
  it('requests the customer account with paging', async () => {
    server.use(
      http.get(`*/api/v1/customers/${CUSTOMER_ID}/account-receivable`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('page')).toBe('2');
        expect(params.get('limit')).toBe('25');
        return HttpResponse.json(buildAccountResponse());
      }),
    );
    const account = await getCustomerAccountApi(CUSTOMER_ID, 2, 25);
    expect(account.summary.totalBalance).toBe('484.00');
  });

  it('sends only the debtor filters that are set', async () => {
    server.use(
      http.get('*/api/v1/receivables', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(Object.fromEntries(params)).toEqual({
          page: '1',
          limit: '20',
          status: DebtorStatus.MOROSO,
        });
        return HttpResponse.json(buildDebtorsResponse());
      }),
    );
    await getDebtorsApi({ page: 1, limit: 20, status: DebtorStatus.MOROSO });
  });

  it('downloads the statement as a blob', async () => {
    server.use(
      http.get(
        `*/api/v1/customers/${CUSTOMER_ID}/account-receivable/pdf`,
        () => new HttpResponse('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
      ),
    );
    const blob = await downloadAccountStatementPdfApi(CUSTOMER_ID);
    expect(blob.size).toBeGreaterThan(0);
  });
});

import { TaxCondition } from '@erp/shared-types';
import { validateCustomerSearchParams } from './router';

describe('validateCustomerSearchParams', () => {
  it('keeps valid URL filters, including false, and preserves user search text', () => {
    expect(
      validateCustomerSearchParams({
        page: '2',
        limit: '25',
        search: ' Clínica 123 ',
        taxCondition: TaxCondition.MONOTRIBUTO,
        isActive: 'false',
      }),
    ).toMatchObject({
      page: 2,
      limit: 25,
      search: 'Clínica 123',
      taxCondition: TaxCondition.MONOTRIBUTO,
      isActive: false,
    });
  });

  it('falls back to active customers and safe pagination', () => {
    expect(validateCustomerSearchParams({ page: '-1', limit: '999' })).toMatchObject({
      page: 1,
      limit: 10,
      isActive: true,
    });
  });
});

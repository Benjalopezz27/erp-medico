import axios from 'axios';
import { CustomerPricingErrorCode } from '@erp/shared-types';
import { parseCustomerPricingError } from './customer-pricing.errors';

describe('parseCustomerPricingError', () => {
  it('maps duplicate conflicts and preserves request tracking', () => {
    const error = new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: {} } as never,
      data: {
        code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS,
        requestId: 'req-192',
      },
    });
    expect(parseCustomerPricingError(error)).toMatchObject({
      code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS,
      status: 409,
      shouldRefresh: true,
      message: expect.stringContaining('req-192'),
    });
  });

  it('returns a network-safe message without forcing refresh', () => {
    const error = new axios.AxiosError('Network', 'ERR_NETWORK');
    expect(parseCustomerPricingError(error)).toMatchObject({
      shouldRefresh: false,
      message: expect.stringContaining('conectar'),
    });
  });
});

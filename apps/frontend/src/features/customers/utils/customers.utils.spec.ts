import { CustomerDocumentType } from '@erp/shared-types';
import { buildMailtoUrl, buildTelUrl } from './customer-contact.utils';
import { formatCustomerDocument, formatDni } from './customer-document.utils';

describe('customer presentation utilities', () => {
  it('formats DNI and CUIT without changing their canonical source', () => {
    expect(formatDni('35123456')).toBe('35.123.456');
    expect(formatCustomerDocument(CustomerDocumentType.CUIT, '30500010912')).toBe('30-50001091-2');
  });

  it('builds only safe contact links', () => {
    expect(buildMailtoUrl('cliente@example.com')).toBe('mailto:cliente%40example.com');
    expect(buildMailtoUrl('not-an-email')).toBeNull();
    expect(buildTelUrl('+54 351-555-0101')).toBe('tel:+543515550101');
    expect(buildTelUrl('javascript:alert(1)')).toBeNull();
  });
});

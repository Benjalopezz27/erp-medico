import { describe, it, expect } from 'vitest';
import { TaxCondition } from '@erp/shared-types';
import { supplierFormSchema } from './suppliers.schema';

describe('supplierFormSchema Validation Suite', () => {
  const validSupplierInput = {
    businessName: 'Droguería del Sol S.A.',
    cuit: '30-50001091-2',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    email: 'contacto@drogueriadelsol.com',
    phone: '0351-4890123',
    whatsapp: '5493514890123',
    address: 'Av. Colón 1234, Córdoba',
  };

  it('validates and transforms a complete valid supplier input', () => {
    const result = supplierFormSchema.safeParse(validSupplierInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessName).toBe('Droguería del Sol S.A.');
      expect(result.data.cuit).toBe('30-50001091-2');
      expect(result.data.taxCondition).toBe(TaxCondition.RESPONSABLE_INSCRIPTO);
      expect(result.data.email).toBe('contacto@drogueriadelsol.com');
      expect(result.data.phone).toBe('0351-4890123');
      expect(result.data.whatsapp).toBe('5493514890123');
      expect(result.data.address).toBe('Av. Colón 1234, Córdoba');
    }
  });

  it('transforms empty optional fields into null', () => {
    const inputWithEmpties = {
      businessName: 'Farmacia Modelo',
      cuit: '20-12345678-6',
      taxCondition: TaxCondition.MONOTRIBUTO,
      email: '',
      phone: '   ',
      whatsapp: '',
      address: '',
    };

    const result = supplierFormSchema.safeParse(inputWithEmpties);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.whatsapp).toBeNull();
      expect(result.data.address).toBeNull();
    }
  });

  it('rejects empty or missing business name', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierInput,
      businessName: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid CUIT format or checksum', () => {
    const resultInvalidChars = supplierFormSchema.safeParse({
      ...validSupplierInput,
      cuit: '20abc12345678x6',
    });
    expect(resultInvalidChars.success).toBe(false);

    const resultInvalidChecksum = supplierFormSchema.safeParse({
      ...validSupplierInput,
      cuit: '30-50001091-9',
    });
    expect(resultInvalidChecksum.success).toBe(false);
  });

  it('rejects invalid email format when provided', () => {
    const result = supplierFormSchema.safeParse({
      ...validSupplierInput,
      email: 'invalid-email-address',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid WhatsApp digit length when provided', () => {
    const resultTooShort = supplierFormSchema.safeParse({
      ...validSupplierInput,
      whatsapp: '123456',
    });
    expect(resultTooShort.success).toBe(false);
  });
});

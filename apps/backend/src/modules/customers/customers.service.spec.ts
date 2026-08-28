import { ForbiddenException } from '@nestjs/common';
import {
  AuditAction,
  CustomerDocumentType,
  CustomerErrorCode,
  TaxCondition,
  UserRole,
} from '@erp/shared-types';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const admin = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'admin@test.com',
    name: 'Admin',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };
  const seller = { ...admin, role: UserRole.VENDEDOR };
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: '20000000-0000-4000-8000-000000000001',
      createdAt: new Date('2026-08-28T00:00:00.000Z'),
      updatedAt: new Date('2026-08-28T00:00:00.000Z'),
      ...value,
    })),
  };
  const manager = { getRepository: jest.fn(() => repo) };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const auditService = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new CustomersService(
    repo as any,
    dataSource as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOne.mockResolvedValue(null);
  });

  it('creates a normalized customer and audits the mutation atomically', async () => {
    const result = await service.create(
      {
        businessName: ' Farmacia Central ',
        documentType: CustomerDocumentType.CUIT,
        cuitOrDni: '30-50001091-2',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        email: 'CLIENTE@TEST.COM',
        creditLimit: '1500.5',
      },
      admin,
    );

    expect(result).toMatchObject({
      businessName: 'Farmacia Central',
      cuitOrDni: '30500010912',
      creditLimit: '1500.50',
      isActive: true,
    });
    expect(result).not.toHaveProperty('currentBalance');
    expect(auditService.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: AuditAction.CREATE }),
    );
  });

  it('rejects a positive initial credit limit for sellers before writing', async () => {
    await expect(
      service.create(
        {
          businessName: 'Cliente Vendedor',
          documentType: CustomerDocumentType.DNI,
          cuitOrDni: '35.123.456',
          taxCondition: TaxCondition.CONSUMIDOR_FINAL,
          creditLimit: '1.00',
        },
        seller,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects sensitive update fields from sellers', async () => {
    await expect(
      service.update(
        '20000000-0000-4000-8000-000000000001',
        { creditLimit: '0.00' },
        seller,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: CustomerErrorCode.CUSTOMER_FORBIDDEN_FIELD_UPDATE,
      }),
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects an incompatible DNI tax condition atomically', async () => {
    await expect(
      service.create(
        {
          businessName: 'Cliente Inválido',
          documentType: CustomerDocumentType.DNI,
          cuitOrDni: '35.123.456',
          taxCondition: TaxCondition.MONOTRIBUTO,
        },
        admin,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: CustomerErrorCode.CUSTOMER_TAX_CONDITION_INCOMPATIBLE,
      }),
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

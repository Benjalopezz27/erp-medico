import { ConflictException } from '@nestjs/common';
import {
  SupplierInvoiceDecisionAction,
  SupplierInvoiceStatus,
} from '@erp/shared-types';
import { SupplierInvoiceDecisionsService } from './supplier-invoice-decisions.service';

jest.mock('../mappers/supplier-invoice.mapper', () => ({
  mapSupplierInvoiceDetail: jest.fn(() => ({ id: 'invoice', items: [] })),
}));

describe('SupplierInvoiceDecisionsService', () => {
  const auditService = { record: jest.fn() } as any;
  const qb = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const manager = {
    createQueryBuilder: jest.fn(() => qb),
    save: jest.fn(async (_entity, value) => value),
    findOneOrFail: jest.fn(async () => ({})),
  } as any;
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  } as any;
  let service: SupplierInvoiceDecisionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SupplierInvoiceDecisionsService(dataSource, auditService);
  });

  it('authorizes an observed invoice exactly once', async () => {
    const invoice: any = {
      id: 'invoice',
      status: SupplierInvoiceStatus.OBSERVADA,
      decisionAction: null,
      costTolerancePercentageSnapshot: '5.0000',
    };
    qb.getOne.mockResolvedValue(invoice);
    await service.authorize('invoice', 'admin');
    expect(invoice.status).toBe(SupplierInvoiceStatus.AUTORIZADA);
    expect(invoice.decisionAction).toBe(
      SupplierInvoiceDecisionAction.AUTHORIZE,
    );
    expect(auditService.record).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    qb.getOne.mockResolvedValue(invoice);
    await service.authorize('invoice', 'admin');
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('rejects an opposite or invalid transition', async () => {
    qb.getOne.mockResolvedValue({
      id: 'invoice',
      status: SupplierInvoiceStatus.RECHAZADA,
      decisionAction: SupplierInvoiceDecisionAction.REJECT,
    });
    await expect(service.authorize('invoice', 'admin')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

import { Test } from '@nestjs/testing';
import { User } from '../../users/entities/user.entity';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesService } from '../services/supplier-invoices.service';
import { SupplierInvoiceDecisionsService } from '../services/supplier-invoice-decisions.service';
import { SupplierInvoiceConfirmationService } from '../services/supplier-invoice-confirmation.service';

describe('SupplierInvoicesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findPendingReceipts: jest.fn(),
    findOne: jest.fn(),
  };
  const decisions = { authorize: jest.fn(), reject: jest.fn() };
  const confirmation = { confirm: jest.fn() };
  let controller: SupplierInvoicesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SupplierInvoicesController],
      providers: [
        { provide: SupplierInvoicesService, useValue: service },
        { provide: SupplierInvoiceDecisionsService, useValue: decisions },
        { provide: SupplierInvoiceConfirmationService, useValue: confirmation },
      ],
    }).compile();
    controller = module.get(SupplierInvoicesController);
  });

  it('delegates creation with the authenticated actor', async () => {
    const dto: any = { goodsReceiptId: 'receipt', items: [{}] };
    const actor = { id: 'admin' } as User;
    service.create.mockResolvedValue({ id: 'invoice' });
    await expect(controller.create(dto, actor)).resolves.toEqual({
      id: 'invoice',
    });
    expect(service.create).toHaveBeenCalledWith(dto, 'admin');
  });

  it('delegates list, pending receipts and detail queries', async () => {
    service.findAll.mockResolvedValue({ data: [] });
    service.findPendingReceipts.mockResolvedValue({ data: [] });
    service.findOne.mockResolvedValue({ id: 'invoice' });
    await controller.findAll({ page: 2, limit: 10 });
    await controller.findPendingReceipts({ page: 1, limit: 20 });
    await controller.findOne('invoice');
    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(service.findPendingReceipts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    expect(service.findOne).toHaveBeenCalledWith('invoice');
  });

  it('delegates observed invoice decisions with the actor', async () => {
    const actor = { id: 'admin' } as User;
    decisions.authorize.mockResolvedValue({ id: 'invoice' });
    decisions.reject.mockResolvedValue({ id: 'invoice' });
    await controller.authorize('invoice', actor);
    await controller.reject('invoice', { reason: 'Costo incorrecto' }, actor);
    expect(decisions.authorize).toHaveBeenCalledWith('invoice', 'admin');
    expect(decisions.reject).toHaveBeenCalledWith(
      'invoice',
      'admin',
      'Costo incorrecto',
    );
  });

  it('delegates idempotent confirmation with the actor', async () => {
    const actor = { id: 'admin' } as User;
    confirmation.confirm.mockResolvedValue({ id: 'invoice' });
    await expect(controller.confirm('invoice', actor)).resolves.toEqual({
      id: 'invoice',
    });
    expect(confirmation.confirm).toHaveBeenCalledWith('invoice', 'admin');
  });
});

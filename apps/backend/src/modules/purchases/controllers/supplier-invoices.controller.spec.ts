import { Test } from '@nestjs/testing';
import { User } from '../../users/entities/user.entity';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesService } from '../services/supplier-invoices.service';

describe('SupplierInvoicesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findPendingReceipts: jest.fn(),
    findOne: jest.fn(),
  };
  let controller: SupplierInvoicesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SupplierInvoicesController],
      providers: [{ provide: SupplierInvoicesService, useValue: service }],
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
});

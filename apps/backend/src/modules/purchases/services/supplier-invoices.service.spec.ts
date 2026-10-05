import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySupplierInvoicesDto } from '../dto/query-supplier-invoices.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupplierInvoicesService } from './supplier-invoices.service';

describe('SupplierInvoicesService', () => {
  const dataSource = { transaction: jest.fn(), manager: {} } as any;
  const auditService = { record: jest.fn() } as any;
  const systemConfigService = {
    getPurchaseToleranceSnapshot: jest.fn(),
  } as any;
  const invoiceRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;
  const receiptRepository = { find: jest.fn() } as any;
  let service: SupplierInvoicesService;

  const validDto: any = {
    goodsReceiptId: '11111111-1111-4111-a111-111111111111',
    invoiceNumber: 'A 0001-00000001',
    invoiceDate: '2026-08-27',
    taxTotal: '0.0000',
    items: [
      {
        goodsReceiptItemId: '22222222-2222-4222-a222-222222222222',
        invoicedQtyPurchaseUnit: '1.0000',
        unitPriceNet: '10.0000',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    systemConfigService.getPurchaseToleranceSnapshot.mockResolvedValue(
      '5.0000',
    );
    service = new SupplierInvoicesService(
      dataSource,
      auditService,
      systemConfigService,
      invoiceRepository,
      receiptRepository,
    );
  });

  it('rejects impossible dates and duplicate request lines before opening a transaction', async () => {
    await expect(
      service.create({ ...validDto, invoiceDate: '2026-02-30' }, 'user'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        { ...validDto, items: [validDto.items[0], validDto.items[0]] },
        'user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('maps unique and serialization database failures to stable conflicts', async () => {
    dataSource.transaction.mockRejectedValueOnce({ code: '23505' });
    await expect(service.create(validDto, 'user')).rejects.toBeInstanceOf(
      ConflictException,
    );
    dataSource.transaction.mockRejectedValueOnce({ code: '40001' });
    await expect(service.create(validDto, 'user')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns a domain 404 for an unknown invoice', async () => {
    invoiceRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('findAll sorting', () => {
    const makeQb = () => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    it('sorts by totalGross mapped to totalAmount with id tie-break', async () => {
      const qb = makeQb();
      invoiceRepository.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({ sortBy: 'totalGross', sortOrder: 'desc' } as any);
      expect(qb.orderBy).toHaveBeenCalledWith('invoice.totalAmount', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('invoice.id', 'DESC');
    });

    it('keeps createdAt DESC default without sortBy', async () => {
      const qb = makeQb();
      invoiceRepository.createQueryBuilder.mockReturnValue(qb);
      await service.findAll({} as any);
      expect(qb.orderBy).toHaveBeenCalledWith('invoice.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('invoice.id', 'DESC');
    });

    it('rejects invalid sortBy at DTO level', async () => {
      const dto = plainToInstance(QuerySupplierInvoicesDto, { sortBy: 'x' });
      expect((await validate(dto)).map((e) => e.property)).toContain('sortBy');
    });
  });
});

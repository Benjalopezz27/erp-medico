import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { AuditService } from '../audit/audit.service';
import { TaxCondition, AuditAction, UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

describe('SuppliersService Unit Tests', () => {
  let service: SuppliersService;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;
  let auditService: jest.Mocked<AuditService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockTxSupplierRepo: jest.Mocked<Repository<Supplier>>;

  const mockAdminActor: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Admin Tester',
    email: 'admin@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const sampleSupplier: Supplier = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    businessName: 'Droguería del Sol S.A.',
    cuit: '30500010912',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    email: 'contacto@drogueriadelsol.com',
    phone: '0351-4890123',
    whatsapp: '5493514890123',
    address: 'Av. Colón 1234, Córdoba',
    isActive: true,
    createdAt: new Date('2026-08-25T10:00:00.000Z'),
    updatedAt: new Date('2026-08-25T10:00:00.000Z'),
  };

  beforeEach(async () => {
    mockTxSupplierRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Supplier>>;

    mockEntityManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Supplier) return mockTxSupplierRepo;
        return {};
      }),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockEntityManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    supplierRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Supplier>>;

    auditService = {
      record: jest.fn().mockResolvedValue({} as any),
    } as unknown as jest.Mocked<AuditService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: supplierRepository,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  describe('create', () => {
    const createDto: CreateSupplierDto = {
      businessName: '  Droguería del Sol S.A.  ',
      cuit: '30-50001091-2',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      email: ' Contacto@DrogueriaDelSol.com ',
      phone: ' 0351-4890123 ',
      whatsapp: ' 5493514890123 ',
      address: ' Av. Colón 1234 ',
    };

    it('creates supplier with canonical CUIT and records atomic audit', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(null);
      mockTxSupplierRepo.create.mockReturnValue(sampleSupplier);
      mockTxSupplierRepo.save.mockResolvedValue(sampleSupplier);

      const result = await service.create(createDto, mockAdminActor);

      expect(mockTxSupplierRepo.findOne).toHaveBeenCalledWith({
        where: { cuit: '30500010912' },
      });
      expect(mockTxSupplierRepo.create).toHaveBeenCalledWith({
        businessName: 'Droguería del Sol S.A.',
        cuit: '30500010912',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        email: 'contacto@drogueriadelsol.com',
        phone: '0351-4890123',
        whatsapp: '5493514890123',
        address: 'Av. Colón 1234',
        isActive: true,
      });
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          actorId: mockAdminActor.id,
          action: AuditAction.CREATE,
          entityName: 'Supplier',
          entityId: sampleSupplier.id,
          previousValues: null,
          newValues: expect.objectContaining({
            cuit: '30500010912',
            businessName: 'Droguería del Sol S.A.',
          }),
        }),
      );
      expect(result.id).toBe(sampleSupplier.id);
      expect(result.cuit).toBe('30500010912');
    });

    it('converts empty optional strings to null', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(null);
      mockTxSupplierRepo.create.mockReturnValue({
        ...sampleSupplier,
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
      });
      mockTxSupplierRepo.save.mockResolvedValue({
        ...sampleSupplier,
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
      });

      await service.create(
        {
          businessName: 'Farmacia Test',
          cuit: '20-12345678-6',
          taxCondition: TaxCondition.MONOTRIBUTO,
          email: '',
          phone: '   ',
          whatsapp: '',
          address: '',
        },
        mockAdminActor,
      );

      expect(mockTxSupplierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
          phone: null,
          whatsapp: null,
          address: null,
        }),
      );
    });

    it('throws BadRequestException if CUIT has illegal characters', async () => {
      await expect(
        service.create(
          { ...createDto, cuit: '20abc12345678x6' },
          mockAdminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on pre-check duplicate CUIT', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(sampleSupplier);

      await expect(service.create(createDto, mockAdminActor)).rejects.toThrow(
        ConflictException,
      );
      expect(mockTxSupplierRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException on concurrent duplicate 23505 error', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(null);
      mockTxSupplierRepo.create.mockReturnValue(sampleSupplier);
      mockTxSupplierRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(createDto, mockAdminActor)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('executes paginated query with search, filter, and deterministic sort', async () => {
      const qbMock: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[sampleSupplier], 1]),
      };
      supplierRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.findAll({
        page: 2,
        limit: 10,
        search: '30-5000',
        isActive: true,
        sortBy: 'businessName',
        sortOrder: 'ASC',
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(LOWER(supplier.businessName) LIKE :search OR supplier.cuit LIKE :cuitDigits)',
        { search: '%30-5000%', cuitDigits: '%305000%' },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'supplier.isActive = :isActive',
        { isActive: true },
      );
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        'supplier.businessName',
        'ASC',
      );
      expect(qbMock.addOrderBy).toHaveBeenCalledWith('supplier.id', 'DESC');
      expect(qbMock.skip).toHaveBeenCalledWith(10);
      expect(qbMock.take).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns supplier when found', async () => {
      supplierRepository.findOne.mockResolvedValue(sampleSupplier);
      const result = await service.findOne(sampleSupplier.id);
      expect(result.id).toBe(sampleSupplier.id);
    });

    it('throws NotFoundException when supplier is missing', async () => {
      supplierRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates fields and records AuditAction.UPDATE', async () => {
      const existing = { ...sampleSupplier };
      mockTxSupplierRepo.findOne.mockResolvedValue(existing);
      mockTxSupplierRepo.save.mockImplementation(async (entity: any) => entity);

      const updateDto: UpdateSupplierDto = {
        businessName: 'Droguería del Sol Renovada S.A.',
        phone: '0351-9999999',
      };

      const result = await service.update(
        sampleSupplier.id,
        updateDto,
        mockAdminActor,
      );

      expect(result.businessName).toBe('Droguería del Sol Renovada S.A.');
      expect(result.phone).toBe('0351-9999999');
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityId: sampleSupplier.id,
          previousValues: expect.objectContaining({
            businessName: 'Droguería del Sol S.A.',
          }),
          newValues: expect.objectContaining({
            businessName: 'Droguería del Sol Renovada S.A.',
          }),
        }),
      );
    });

    it('throws BadRequestException if payload contains no effective changes', async () => {
      const existing = { ...sampleSupplier };
      mockTxSupplierRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update(
          sampleSupplier.id,
          {
            businessName: ' Droguería del Sol S.A. ', // same after trim
            email: 'contacto@drogueriadelsol.com', // same after normalize
          },
          mockAdminActor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockTxSupplierRepo.save).not.toHaveBeenCalled();
    });

    it('records AuditAction.ACTIVATE when reactivating an inactive supplier', async () => {
      const inactive = { ...sampleSupplier, isActive: false };
      mockTxSupplierRepo.findOne.mockResolvedValue(inactive);
      mockTxSupplierRepo.save.mockImplementation(async (entity: any) => entity);

      await service.update(
        sampleSupplier.id,
        { isActive: true },
        mockAdminActor,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.ACTIVATE,
          entityId: sampleSupplier.id,
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('soft-deactivates active supplier and records AuditAction.DEACTIVATE', async () => {
      const active = { ...sampleSupplier, isActive: true };
      mockTxSupplierRepo.findOne.mockResolvedValue(active);
      mockTxSupplierRepo.save.mockImplementation(async (entity: any) => entity);

      const result = await service.deactivate(
        sampleSupplier.id,
        mockAdminActor,
      );

      expect(result.isActive).toBe(false);
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          action: AuditAction.DEACTIVATE,
          entityId: sampleSupplier.id,
          previousValues: expect.objectContaining({ isActive: true }),
          newValues: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('throws BadRequestException if supplier is already inactive', async () => {
      const alreadyInactive = { ...sampleSupplier, isActive: false };
      mockTxSupplierRepo.findOne.mockResolvedValue(alreadyInactive);

      await expect(
        service.deactivate(sampleSupplier.id, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
      expect(mockTxSupplierRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if supplier is not found', async () => {
      mockTxSupplierRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deactivate('missing-id', mockAdminActor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

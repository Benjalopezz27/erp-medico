import { Test, TestingModule } from '@nestjs/testing';
import { QuarantineController } from './quarantine.controller';
import { QuarantineService } from './quarantine.service';
import {
  QuarantineStatus,
  QuarantineResolution,
  UserRole,
} from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateQuarantineDto, QueryQuarantineDto, ResolveQuarantineDto } from './dto';

describe('QuarantineController Unit Tests', () => {
  let controller: QuarantineController;
  let service: jest.Mocked<QuarantineService>;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@erp.com',
    name: 'Admin User',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockResponseItem = {
    id: 'quar-uuid-1',
    productId: 'prod-uuid-1',
    product: {
      id: 'prod-uuid-1',
      internalCode: 'P0001',
      name: 'Amoxicilina 500mg',
      baseUnit: { id: 'u-1', name: 'Comprimido', symbol: 'cmp' },
    },
    quantityBase: 10,
    reason: 'Cajas rotas',
    status: QuarantineStatus.EN_CUARENTENA,
    entryActorId: 'user-admin-1',
    entryActor: { id: 'user-admin-1', name: 'Admin User', email: 'admin@erp.com' },
    entryMovementId: 'mov-1',
    resolvedByActorId: null,
    resolvedByActor: null,
    resolutionNotes: null,
    resolutionMovementId: null,
    resolvedAt: null,
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
  };

  beforeEach(async () => {
    service = {
      createEntry: jest.fn(),
      findAll: jest.fn(),
      resolve: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuarantineController],
      providers: [
        {
          provide: QuarantineService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<QuarantineController>(QuarantineController);
  });

  describe('create', () => {
    it('delegates quarantine entry creation to service with user ID', async () => {
      const dto: CreateQuarantineDto = {
        productId: 'prod-uuid-1',
        quantityBase: 10,
        reason: 'Cajas rotas',
      };
      service.createEntry.mockResolvedValueOnce(mockResponseItem);

      const result = await controller.create(dto, mockAdminUser);

      expect(service.createEntry).toHaveBeenCalledWith(dto, 'user-admin-1');
      expect(result).toEqual(mockResponseItem);
    });
  });

  describe('findAll', () => {
    it('delegates quarantine querying to service', async () => {
      const query: QueryQuarantineDto = {
        page: 1,
        limit: 10,
        status: QuarantineStatus.EN_CUARENTENA,
      };
      const paginatedResult = {
        items: [mockResponseItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      service.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('resolve', () => {
    it('delegates resolution to service with id and user ID', async () => {
      const dto: ResolveQuarantineDto = {
        resolution: QuarantineResolution.REINGRESO,
        resolutionNotes: 'Apto para venta',
      };
      const resolvedItem = {
        ...mockResponseItem,
        status: QuarantineStatus.REINGRESADO_STOCK,
        resolutionNotes: 'Apto para venta',
      };
      service.resolve.mockResolvedValueOnce(resolvedItem);

      const result = await controller.resolve('quar-uuid-1', dto, mockAdminUser);

      expect(service.resolve).toHaveBeenCalledWith('quar-uuid-1', dto, 'user-admin-1');
      expect(result).toEqual(resolvedItem);
    });
  });
});

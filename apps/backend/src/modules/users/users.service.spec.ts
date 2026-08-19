import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole, AuditAction } from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;
  let auditService: jest.Mocked<AuditService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAdminActor: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@erp.com',
    name: 'Admin Actor',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockTargetUser: User = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Target User',
    email: 'target@erp.com',
    passwordHash: '$2b$12$hashedpassword...',
    role: UserRole.VENDEDOR,
    isActive: true,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    normalizeEmailField: jest.fn(),
  };

  const mockAdminUser: User = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Admin Actor',
    email: 'admin@erp.com',
    passwordHash: '$2b$12$hashedpassword...',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    normalizeEmailField: jest.fn(),
  };

  const mockQueryBuilder: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto }) as User),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'new-uuid', ...entity }),
      ),
      count: jest.fn().mockResolvedValue(2),
    } as any;

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-log-1' } as any),
      findEntityAuditLogs: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    } as any;

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(repo),
          query: jest.fn().mockResolvedValue([]),
        } as unknown as EntityManager;
        return cb(mockManager);
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
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

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return module initialization status', () => {
      expect(service.getStatus()).toEqual({
        module: 'users',
        status: 'initialized',
      });
    });
  });

  describe('findByEmail', () => {
    it('should query with normalized lowercase email', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTargetUser);

      const result = await service.findByEmail('  TARGET@ERP.COM ');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        {
          email: 'target@erp.com',
        },
      );
      expect(mockQueryBuilder.addSelect).not.toHaveBeenCalled();
      expect(result).toEqual(mockTargetUser);
    });

    it('should add passwordHash to select if includePassword is true', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTargetUser);

      await service.findByEmail('target@erp.com', true);

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'user.passwordHash',
      );
    });

    it('should return null for empty email without querying', async () => {
      const result = await service.findByEmail('');
      expect(result).toBeNull();
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should call repository.findOne with id and return User | null', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser);

      const result = await service.findById(mockTargetUser.id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: mockTargetUser.id },
      });
      expect(result).toEqual(mockTargetUser);
    });

    it('should return null if not found without throwing', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated users with filters and sorting applied', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTargetUser], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'target',
        role: UserRole.VENDEDOR,
        isActive: true,
        sortBy: 'name',
        sortOrder: 'ASC',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: '%target%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.role = :role',
        { role: UserRole.VENDEDOR },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.name', 'ASC');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getByIdOrFail', () => {
    it('should return user response DTO if found', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser);

      const result = await service.getByIdOrFail(mockTargetUser.id);
      expect(result.id).toBe(mockTargetUser.id);
      expect(result.email).toBe(mockTargetUser.email);
    });

    it('should throw NotFoundException if user not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getByIdOrFail('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createByAdmin', () => {
    it('should create user in a transaction and record an audit log', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...mockTargetUser,
          ...entity,
          id: 'generated-uuid',
        } as User),
      );

      const result = await service.createByAdmin(
        {
          name: 'New Employee',
          email: '  NEW.EMP@ERP.COM ',
          password: 'Password123!',
          role: UserRole.VENDEDOR,
        },
        mockAdminActor,
      );

      expect(result.id).toBe('generated-uuid');
      expect(result.email).toBe('new.emp@erp.com');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorId: mockAdminActor.id,
          action: AuditAction.CREATE,
          entityName: 'User',
          entityId: 'generated-uuid',
          previousValues: null,
          newValues: expect.objectContaining({
            email: 'new.emp@erp.com',
            role: UserRole.VENDEDOR,
          }),
        }),
      );
    });

    it('should throw ConflictException if email already registered', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser);

      await expect(
        service.createByAdmin(
          {
            name: 'Another Employee',
            email: 'target@erp.com',
            password: 'Password123!',
          },
          mockAdminActor,
        ),
      ).rejects.toThrow(ConflictException);

      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('updateByAdmin', () => {
    it('should throw BadRequestException if update payload is empty', async () => {
      await expect(
        service.updateByAdmin(mockTargetUser.id, {} as any, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateByAdmin(
          'missing-id',
          { name: 'Updated' },
          mockAdminActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if update contains no effective changes', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser);

      await expect(
        service.updateByAdmin(
          mockTargetUser.id,
          { name: mockTargetUser.name, email: mockTargetUser.email },
          mockAdminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when actor attempts self-deactivation', async () => {
      repo.findOne.mockResolvedValue(mockAdminUser);

      await expect(
        service.updateByAdmin(
          mockAdminActor.id,
          { isActive: false },
          mockAdminActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when attempting to deactivate the last active admin', async () => {
      const otherAdminUser = { ...mockAdminUser, id: '33333333-3333-3333-3333-333333333333' } as User;
      repo.findOne.mockResolvedValue(otherAdminUser);
      repo.count.mockResolvedValue(1);

      await expect(
        service.updateByAdmin(
          otherAdminUser.id,
          { isActive: false },
          mockAdminActor,
        ),
      ).rejects.toThrow('Cannot deactivate the last remaining active administrator');
    });

    it('should throw ConflictException when attempting to demote the last active admin', async () => {
      repo.findOne.mockResolvedValue(mockAdminUser);
      repo.count.mockResolvedValue(1);

      await expect(
        service.updateByAdmin(
          mockAdminUser.id,
          { role: UserRole.VENDEDOR },
          mockAdminActor,
        ),
      ).rejects.toThrow('Cannot demote the last remaining active administrator');
    });

    it('should permit self-demotion if another active admin exists', async () => {
      repo.findOne.mockResolvedValue({ ...mockAdminUser } as User);
      repo.count.mockResolvedValue(2);
      repo.save.mockImplementation((u) => Promise.resolve(u as User));

      const result = await service.updateByAdmin(
        mockAdminActor.id,
        { role: UserRole.VENDEDOR },
        mockAdminActor,
      );

      expect(result.role).toBe(UserRole.VENDEDOR);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.ROLE_CHANGE,
        }),
      );
    });

    it('should assign correct action precedence (DEACTIVATE > ACTIVATE > ROLE_CHANGE > UPDATE)', async () => {
      repo.findOne.mockResolvedValue({ ...mockTargetUser, isActive: true } as User);
      repo.save.mockImplementation((u) => Promise.resolve(u as User));

      await service.updateByAdmin(
        mockTargetUser.id,
        { isActive: false, role: UserRole.ADMINISTRADOR },
        mockAdminActor,
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.DEACTIVATE,
        }),
      );
    });
  });

  describe('deactivateByAdmin', () => {
    it('should call updateByAdmin with isActive: false', async () => {
      jest.spyOn(service, 'updateByAdmin').mockResolvedValue(mockTargetUser as any);

      const result = await service.deactivateByAdmin(mockTargetUser.id, mockAdminActor);
      expect(service.updateByAdmin).toHaveBeenCalledWith(
        mockTargetUser.id,
        { isActive: false },
        mockAdminActor,
      );
      expect(result).toEqual(mockTargetUser);
    });
  });

  describe('getAuditLogsForUser', () => {
    it('should return audit logs when user exists', async () => {
      repo.findOne.mockResolvedValue(mockTargetUser);

      const result = await service.getAuditLogsForUser(mockTargetUser.id, {
        page: 1,
        limit: 10,
      });

      expect(auditService.findEntityAuditLogs).toHaveBeenCalledWith(
        'User',
        mockTargetUser.id,
        { page: 1, limit: 10 },
      );
      expect(result.data).toBeDefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.getAuditLogsForUser('non-existent', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
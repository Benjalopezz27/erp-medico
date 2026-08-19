import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '@erp/shared-types';

describe('AuditService', () => {
  let service: AuditService;
  let repo: jest.Mocked<Repository<AuditLog>>;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should record an audit log using the provided EntityManager', async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'log-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const mockManager = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    } as unknown as EntityManager;

    const event = {
      actorId: '123e4567-e89b-12d3-a456-426614174000',
      action: AuditAction.CREATE,
      entityName: 'User',
      entityId: '123e4567-e89b-12d3-a456-426614174001',
      previousValues: null,
      newValues: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'New User',
        email: 'user@erp.com',
        password: 'should-be-stripped',
      },
    };

    const result = await service.record(mockManager, event);

    expect(mockManager.getRepository).toHaveBeenCalledWith(AuditLog);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: event.actorId,
        action: AuditAction.CREATE,
        entityName: 'User',
        entityId: event.entityId,
        previousValues: null,
        newValues: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'New User',
          email: 'user@erp.com',
        },
      }),
    );
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.id).toBe('log-1');
  });

  it('should paginate entity audit logs with descending order', async () => {
    const mockItem = {
      id: 'log-1',
      actorId: 'actor-1',
      action: AuditAction.CREATE,
      entityName: 'User',
      entityId: 'target-1',
      previousValues: null,
      newValues: { name: 'User 1' },
      createdAt: new Date('2026-01-01T10:00:00Z'),
      actor: {
        id: 'actor-1',
        name: 'Admin',
        email: 'admin@erp.com',
        role: 'ADMINISTRADOR',
      },
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockItem], 1]),
    };

    repo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

    const result = await service.findEntityAuditLogs('User', 'target-1', {
      page: 1,
      limit: 10,
      action: AuditAction.CREATE,
    });

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'audit.entityName = :entityName',
      { entityName: 'User' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.entityId = :entityId',
      { entityId: 'target-1' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'audit.action = :action',
      { action: AuditAction.CREATE },
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'audit.createdAt',
      'DESC',
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPreviousPage).toBe(false);
  });
});

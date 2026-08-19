import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockAdminActor: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@erp.com',
    name: 'Admin Actor',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockUserResponse = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Target User',
    email: 'target@erp.com',
    role: UserRole.VENDEDOR,
    isActive: true,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    service = {
      getStatus: jest
        .fn()
        .mockReturnValue({ module: 'users', status: 'initialized' }),
      findAll: jest.fn().mockResolvedValue({
        data: [mockUserResponse],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
      getByIdOrFail: jest.fn().mockResolvedValue(mockUserResponse),
      createByAdmin: jest.fn().mockResolvedValue(mockUserResponse),
      updateByAdmin: jest.fn().mockResolvedValue(mockUserResponse),
      deactivateByAdmin: jest
        .fn()
        .mockResolvedValue({ ...mockUserResponse, isActive: false }),
      getAuditLogsForUser: jest.fn().mockResolvedValue({
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status', () => {
    expect(controller.getStatus()).toEqual({
      module: 'users',
      status: 'initialized',
    });
  });

  it('should find all users with pagination query', async () => {
    const query = {
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'ASC' as const,
    };
    const result = await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
  });

  it('should find one user by ID', async () => {
    const result = await controller.findOne(mockUserResponse.id);
    expect(service.getByIdOrFail).toHaveBeenCalledWith(mockUserResponse.id);
    expect(result.id).toBe(mockUserResponse.id);
  });

  it('should create user by admin', async () => {
    const dto = {
      name: 'New Employee',
      email: 'new@erp.com',
      password: 'Password123!',
      role: UserRole.VENDEDOR,
    };
    const result = await controller.create(dto, mockAdminActor);
    expect(service.createByAdmin).toHaveBeenCalledWith(dto, mockAdminActor);
    expect(result.id).toBe(mockUserResponse.id);
  });

  it('should update user by admin', async () => {
    const dto = { name: 'Updated Name' };
    const result = await controller.update(
      mockUserResponse.id,
      dto,
      mockAdminActor,
    );
    expect(service.updateByAdmin).toHaveBeenCalledWith(
      mockUserResponse.id,
      dto,
      mockAdminActor,
    );
    expect(result.id).toBe(mockUserResponse.id);
  });

  it('should deactivate user by admin', async () => {
    const result = await controller.deactivate(
      mockUserResponse.id,
      mockAdminActor,
    );
    expect(service.deactivateByAdmin).toHaveBeenCalledWith(
      mockUserResponse.id,
      mockAdminActor,
    );
    expect(result.isActive).toBe(false);
  });

  it('should get audit logs for user', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.getAuditLogs(mockUserResponse.id, query);
    expect(service.getAuditLogsForUser).toHaveBeenCalledWith(
      mockUserResponse.id,
      query,
    );
    expect(result.data).toBeDefined();
  });
});

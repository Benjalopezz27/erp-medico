import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '@erp/shared-types';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Admin User',
    email: 'admin@erp.com',
    passwordHash: '$2b$12$dummyhashedpasswordstring',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    normalizeEmailField: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn((dto) => ({ ...dto }) as User),
            save: jest.fn((entity) =>
              Promise.resolve({ id: 'new-uuid', ...entity }),
            ),
            count: jest.fn().mockResolvedValue(2),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
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
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('  ADMIN@ERP.COM ');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        {
          email: 'admin@erp.com',
        },
      );
      expect(mockQueryBuilder.addSelect).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should add passwordHash to select if includePassword is true', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      await service.findByEmail('admin@erp.com', true);

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
    it('should call repository.findOne with id', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should normalize email and save new user', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.create({
        name: 'Vendedor Test',
        email: '  Vendedor@ERP.COM ',
        passwordHash: 'hashed_pw',
        role: UserRole.VENDEDOR,
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Vendedor Test',
        email: 'vendedor@erp.com',
        passwordHash: 'hashed_pw',
        role: UserRole.VENDEDOR,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.email).toBe('vendedor@erp.com');
    });

    it('should throw ConflictException if user email already exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          name: 'Another User',
          email: 'admin@erp.com',
          passwordHash: 'hashed_pw',
          role: UserRole.VENDEDOR,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('count', () => {
    it('should return user count from repository', async () => {
      const count = await service.count();
      expect(count).toBe(2);
      expect(repo.count).toHaveBeenCalled();
    });
  });
});

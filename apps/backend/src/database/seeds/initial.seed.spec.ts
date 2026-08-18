import { DataSource, QueryRunner, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { runInitialSeed } from './initial.seed';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '@erp/shared-types';

describe('initial.seed', () => {
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockUserRepo: jest.Mocked<Repository<User>>;
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto }) as User),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'mock-uuid', ...entity } as User),
      ),
    } as unknown as jest.Mocked<Repository<User>>;

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn().mockReturnValue(mockUserRepo),
      },
    } as unknown as jest.Mocked<QueryRunner>;

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as jest.Mocked<DataSource>;

    jest.clearAllMocks();
  });

  it('should throw an error if SEED_ADMIN_PASSWORD is missing or empty', async () => {
    await expect(
      runInitialSeed(mockDataSource, {
        adminPassword: '',
        vendedorPassword: 'ValidPassword123!',
        logger: mockLogger,
      }),
    ).rejects.toThrow(
      'Mandatory configuration "SEED_ADMIN_PASSWORD" is missing or empty.',
    );

    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('should throw an error if SEED_VENDEDOR_PASSWORD is missing or empty', async () => {
    await expect(
      runInitialSeed(mockDataSource, {
        adminPassword: 'ValidAdminPass123!',
        vendedorPassword: '  ',
        logger: mockLogger,
      }),
    ).rejects.toThrow(
      'Mandatory configuration "SEED_VENDEDOR_PASSWORD" is missing or empty.',
    );

    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('should create both users when neither exists using bcrypt cost 12', async () => {
    mockUserRepo.findOne.mockResolvedValue(null);

    const result = await runInitialSeed(mockDataSource, {
      adminPassword: 'AdminSecretPass123!',
      vendedorPassword: 'VendedorSecretPass123!',
      bcryptRounds: 10, // faster for unit test
      logger: mockLogger,
    });

    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockUserRepo.findOne).toHaveBeenCalledTimes(2);
    expect(mockUserRepo.create).toHaveBeenCalledTimes(2);
    expect(mockUserRepo.save).toHaveBeenCalledTimes(2);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
    expect(result).toEqual({ created: 2, skipped: 0 });

    const firstCreatedCall = mockUserRepo.create.mock
      .calls[0][0] as Partial<User>;
    expect(firstCreatedCall.email).toBe('admin@erp.com');
    expect(firstCreatedCall.role).toBe(UserRole.ADMINISTRADOR);
    expect(
      await bcrypt.compare(
        'AdminSecretPass123!',
        firstCreatedCall.passwordHash!,
      ),
    ).toBe(true);

    const secondCreatedCall = mockUserRepo.create.mock
      .calls[1][0] as Partial<User>;
    expect(secondCreatedCall.email).toBe('vendedor@erp.com');
    expect(secondCreatedCall.role).toBe(UserRole.VENDEDOR);
    expect(
      await bcrypt.compare(
        'VendedorSecretPass123!',
        secondCreatedCall.passwordHash!,
      ),
    ).toBe(true);
  });

  it('should skip users that already exist without error', async () => {
    const existingAdmin = {
      id: 'existing-id',
      email: 'admin@erp.com',
      role: UserRole.ADMINISTRADOR,
    } as User;

    mockUserRepo.findOne
      .mockResolvedValueOnce(existingAdmin) // admin exists
      .mockResolvedValueOnce(null); // vendedor does not exist

    const result = await runInitialSeed(mockDataSource, {
      adminPassword: 'AdminSecretPass123!',
      vendedorPassword: 'VendedorSecretPass123!',
      bcryptRounds: 10,
      logger: mockLogger,
    });

    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should rollback transaction if an error occurs during execution', async () => {
    mockUserRepo.findOne.mockRejectedValueOnce(
      new Error('Database query failure'),
    );

    await expect(
      runInitialSeed(mockDataSource, {
        adminPassword: 'AdminSecretPass123!',
        vendedorPassword: 'VendedorSecretPass123!',
        logger: mockLogger,
      }),
    ).rejects.toThrow('Database query failure');

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});

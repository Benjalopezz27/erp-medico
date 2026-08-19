import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '@erp/shared-types';
import { User } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let configService: ConfigService;

  const validSecret =
    'super_secret_jwt_key_at_least_32_characters_long_123456789';

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return validSecret;
        if (key === 'JWT_EXPIRATION') return '8h';
        return undefined;
      }),
    } as unknown as ConfigService;

    usersService = {
      findById: jest.fn(),
    };

    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate and return authenticated user when payload matches active DB user', async () => {
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash: 'hash',
      role: UserRole.ADMINISTRADOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findById = jest.fn().mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });

    expect(result).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role,
      isActive: true,
    });
  });

  it('should throw UnauthorizedException if user does not exist in DB', async () => {
    usersService.findById = jest.fn().mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'non-existent-uuid',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive in DB', async () => {
    const inactiveUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Inactive User',
      email: 'inactive@erp.com',
      passwordHash: 'hash',
      role: UserRole.VENDEDOR,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findById = jest.fn().mockResolvedValue(inactiveUser);

    await expect(
      strategy.validate({
        sub: inactiveUser.id,
        email: inactiveUser.email,
        role: inactiveUser.role,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token role does not match current DB role', async () => {
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Demoted User',
      email: 'user@erp.com',
      passwordHash: 'hash',
      role: UserRole.VENDEDOR, // Role changed in DB
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findById = jest.fn().mockResolvedValue(mockUser);

    await expect(
      strategy.validate({
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.ADMINISTRADOR, // Outdated token claim
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token email does not match current DB email', async () => {
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Updated Email User',
      email: 'newemail@erp.com',
      passwordHash: 'hash',
      role: UserRole.ADMINISTRADOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findById = jest.fn().mockResolvedValue(mockUser);

    await expect(
      strategy.validate({
        sub: mockUser.id,
        email: 'oldemail@erp.com', // Outdated token claim
        role: UserRole.ADMINISTRADOR,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if payload is invalid or missing sub', async () => {
    await expect(strategy.validate(null as unknown as any)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      strategy.validate({ sub: '' } as unknown as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@erp/shared-types';
import { User } from '../users/entities/user.entity';
import { DUMMY_BCRYPT_HASH } from './constants/auth.constants';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const rawPassword = 'ValidPassword123!';
  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await bcrypt.hash(rawPassword, 12);
  });

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-signed-jwt-token'),
    };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return operational status from getStatus()', () => {
    expect(authService.getStatus()).toEqual({
      module: 'auth',
      status: 'initialized',
    });
  });

  it('should authenticate valid ADMINISTRADOR and return accessToken and sanitized user', async () => {
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash: validPasswordHash,
      role: UserRole.ADMINISTRADOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findByEmail = jest.fn().mockResolvedValue(mockUser);

    const result = await authService.login({
      email: '  Admin@ERP.com  ',
      password: rawPassword,
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith(
      'admin@erp.com',
      true,
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });
    expect(result).toEqual({
      accessToken: 'mock-signed-jwt-token',
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        isActive: true,
      },
    });
    expect((result as any).passwordHash).toBeUndefined();
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('should authenticate valid VENDEDOR and return accessToken and sanitized user', async () => {
    const mockUser: User = {
      id: 'b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'Vendedor User',
      email: 'vendedor@erp.com',
      passwordHash: validPasswordHash,
      role: UserRole.VENDEDOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findByEmail = jest.fn().mockResolvedValue(mockUser);

    const result = await authService.login({
      email: 'vendedor@erp.com',
      password: rawPassword,
    });

    expect(result.user.role).toBe(UserRole.VENDEDOR);
    expect(result.accessToken).toBe('mock-signed-jwt-token');
  });

  it('should execute dummy compare and throw UnauthorizedException when email does not exist', async () => {
    usersService.findByEmail = jest.fn().mockResolvedValue(null);
    const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');

    await expect(
      authService.login({
        email: 'unknown@erp.com',
        password: 'AnyPassword',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    expect(bcryptCompareSpy).toHaveBeenCalledWith(
      'AnyPassword',
      DUMMY_BCRYPT_HASH,
    );
  });

  it('should throw UnauthorizedException when password is incorrect', async () => {
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash: validPasswordHash,
      role: UserRole.ADMINISTRADOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findByEmail = jest.fn().mockResolvedValue(mockUser);

    await expect(
      authService.login({
        email: 'admin@erp.com',
        password: 'WrongPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('should execute dummy compare and throw UnauthorizedException when user is inactive', async () => {
    const inactiveUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Inactive User',
      email: 'inactive@erp.com',
      passwordHash: validPasswordHash,
      role: UserRole.VENDEDOR,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findByEmail = jest.fn().mockResolvedValue(inactiveUser);
    const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');

    await expect(
      authService.login({
        email: 'inactive@erp.com',
        password: rawPassword,
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    expect(bcryptCompareSpy).toHaveBeenCalledWith(
      rawPassword,
      validPasswordHash,
    );
  });

  it('should handle corrupted or unparseable bcrypt hash without throwing 500 error', async () => {
    const corruptedUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Corrupted User',
      email: 'corrupt@erp.com',
      passwordHash: 'not_a_valid_bcrypt_hash',
      role: UserRole.ADMINISTRADOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      normalizeEmailField: jest.fn(),
    };

    usersService.findByEmail = jest.fn().mockResolvedValue(corruptedUser);

    await expect(
      authService.login({
        email: 'corrupt@erp.com',
        password: rawPassword,
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });
});

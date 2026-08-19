import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@erp/shared-types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required on route or class', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRole.VENDEDOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user role matches the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMINISTRADOR]);
    const context = createMockExecutionContext({
      id: 'uuid-1',
      role: UserRole.ADMINISTRADOR,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user role matches one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMINISTRADOR,
      UserRole.VENDEDOR,
    ]);
    const context = createMockExecutionContext({
      id: 'uuid-2',
      role: UserRole.VENDEDOR,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMINISTRADOR]);
    const context = createMockExecutionContext({
      id: 'uuid-3',
      role: UserRole.VENDEDOR,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException if request.user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMINISTRADOR]);
    const context = createMockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

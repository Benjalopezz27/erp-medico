import { UnauthorizedException } from '@nestjs/common';
import { GlobalJwtAuthGuard, JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should return user when authentication succeeds', () => {
    const mockUser = { id: 'uuid-1', email: 'test@erp.com' };
    const result = guard.handleRequest(null, mockUser);
    expect(result).toEqual(mockUser);
  });

  it('should throw UnauthorizedException when error is present', () => {
    expect(() =>
      guard.handleRequest(new Error('Passport error'), null),
    ).toThrow(Error);
  });

  it('should throw UnauthorizedException when user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });
});

describe('GlobalJwtAuthGuard', () => {
  const ctx = (user?: unknown) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;
  const guardFor = (isPublic: boolean | undefined) =>
    new GlobalJwtAuthGuard({ getAllAndOverride: () => isPublic } as any);

  it('lets @Public() routes through without a token', () => {
    expect(guardFor(true).canActivate(ctx())).toBe(true);
  });

  it('skips re-validation when the request is already authenticated', () => {
    expect(guardFor(undefined).canActivate(ctx({ id: 'u1' }))).toBe(true);
  });
});

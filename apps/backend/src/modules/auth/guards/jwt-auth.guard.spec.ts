import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

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

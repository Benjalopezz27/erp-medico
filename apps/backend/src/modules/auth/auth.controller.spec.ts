import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@erp/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

  beforeEach(() => {
    authService = {
      getStatus: jest
        .fn()
        .mockReturnValue({ module: 'auth', status: 'initialized' }),
      login: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  it('should return status from authService', () => {
    expect(controller.getStatus()).toEqual({
      module: 'auth',
      status: 'initialized',
    });
  });

  it('should call authService.login and return result', async () => {
    const expectedResponse = {
      accessToken: 'jwt-token',
      user: {
        id: 'uuid-1',
        name: 'Admin',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    };

    authService.login = jest.fn().mockResolvedValue(expectedResponse);

    const result = await controller.login({
      email: 'admin@erp.com',
      password: 'password',
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@erp.com',
      password: 'password',
    });
    expect(result).toEqual(expectedResponse);
  });
});

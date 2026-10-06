import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { UserRole } from '@erp/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;
  let recovery: jest.Mocked<Partial<PasswordRecoveryService>>;

  beforeEach(() => {
    authService = {
      getStatus: jest
        .fn()
        .mockReturnValue({ module: 'auth', status: 'initialized' }),
      login: jest.fn(),
      register: jest.fn(),
    };

    recovery = {
      forgotPassword: jest.fn().mockResolvedValue({ message: 'sent' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'done' }),
    };

    controller = new AuthController(
      authService as unknown as AuthService,
      recovery as unknown as PasswordRecoveryService,
    );
  });

  it('should return status from authService', () => {
    expect(controller.getStatus()).toEqual({
      module: 'auth',
      status: 'initialized',
    });
  });

  it('delegates forgot-password and reset-password to PasswordRecoveryService', async () => {
    await expect(
      controller.forgotPassword({ email: 'a@erp.com' }),
    ).resolves.toEqual({ message: 'sent' });
    expect(recovery.forgotPassword).toHaveBeenCalledWith('a@erp.com');

    await expect(
      controller.resetPassword({ token: 't', newPassword: 'Valid123!' }),
    ).resolves.toEqual({ message: 'done' });
    expect(recovery.resetPassword).toHaveBeenCalledWith('t', 'Valid123!');
  });

  it('should call authService.register and return result', async () => {
    const dto = { name: 'Nuevo', email: 'n@erp.com', password: 'Valid123!' };
    authService.register = jest.fn().mockResolvedValue({ message: 'ok' });

    await expect(controller.register(dto)).resolves.toEqual({ message: 'ok' });
    expect(authService.register).toHaveBeenCalledWith(dto);
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

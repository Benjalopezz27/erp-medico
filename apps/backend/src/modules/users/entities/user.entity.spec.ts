import { User } from './user.entity';
import { UserRole } from '@erp/shared-types';

describe('User Entity', () => {
  it('should normalize email before insert or update', () => {
    const user = new User();
    user.name = 'Test User';
    user.email = '  Test.User@ERP.COM  ';
    user.passwordHash = 'hashed_secret';
    user.role = UserRole.ADMINISTRADOR;

    user.normalizeEmailField();

    expect(user.email).toBe('test.user@erp.com');
  });

  it('should instantiate correctly with default values', () => {
    const user = new User();
    user.name = 'Vendedor Test';
    user.email = 'vendedor@erp.com';
    user.passwordHash = 'hash123';
    user.role = UserRole.VENDEDOR;
    user.isActive = true;

    expect(user.name).toBe('Vendedor Test');
    expect(user.email).toBe('vendedor@erp.com');
    expect(user.role).toBe(UserRole.VENDEDOR);
    expect(user.isActive).toBe(true);
  });
});

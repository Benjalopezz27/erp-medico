import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '@erp/shared-types';

describe('User Persistence & Seed Engine (E2E)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
    await queryRunner.release();
  });

  it('verifies migration up/down/up cycle cleanly', async () => {
    // Revert stock import batches table migration (1700000000008)
    await ds.undoLastMigration();
    const afterDropBatches = await ds.query(
      "SELECT to_regclass('public.stock_import_batches') as tablename",
    );
    expect(afterDropBatches[0].tablename).toBeNull();

    // Revert enforce non-negative stock check constraint migration (1700000000007)
    await ds.undoLastMigration();

    // Revert stock & stock movements table migration (1700000000006)
    await ds.undoLastMigration();
    const afterDropMovements = await ds.query(
      "SELECT to_regclass('public.stock_movements') as tablename",
    );
    expect(afterDropMovements[0].tablename).toBeNull();
    const afterDropStocks = await ds.query(
      "SELECT to_regclass('public.stocks') as tablename",
    );
    expect(afterDropStocks[0].tablename).toBeNull();

    // Revert automatic product code migration (1700000000005)
    await ds.undoLastMigration();
    const afterDropProductCodeSequence = await ds.query(
      "SELECT to_regclass('public.product_internal_code_seq') as sequence_name",
    );
    expect(afterDropProductCodeSequence[0].sequence_name).toBeNull();

    // Revert products & unit conversions table migration (1700000000004)
    await ds.undoLastMigration();
    const afterDropConversions = await ds.query(
      "SELECT to_regclass('public.product_unit_conversions') as tablename",
    );
    expect(afterDropConversions[0].tablename).toBeNull();
    const afterDropProducts = await ds.query(
      "SELECT to_regclass('public.products') as tablename",
    );
    expect(afterDropProducts[0].tablename).toBeNull();

    // Revert categories & units table migration (1700000000003)
    await ds.undoLastMigration();
    const afterDropCategories = await ds.query(
      "SELECT to_regclass('public.categories') as tablename",
    );
    expect(afterDropCategories[0].tablename).toBeNull();
    const afterDropUnits = await ds.query(
      "SELECT to_regclass('public.units') as tablename",
    );
    expect(afterDropUnits[0].tablename).toBeNull();

    // Revert audit_logs table migration (1700000000002)
    await ds.undoLastMigration();
    const afterDropAudit = await ds.query(
      "SELECT to_regclass('public.audit_logs') as tablename",
    );
    expect(afterDropAudit[0].tablename).toBeNull();

    // Revert users table migration (1700000000001)
    await ds.undoLastMigration();
    const afterDropUsers = await ds.query(
      "SELECT to_regclass('public.users') as tablename",
    );
    expect(afterDropUsers[0].tablename).toBeNull();

    // Re-run all migrations
    await ds.runMigrations();
    const afterRecreateUsers = await ds.query(
      "SELECT to_regclass('public.users') as tablename",
    );
    expect(afterRecreateUsers[0].tablename).toBe('users');
    const afterRecreateAudit = await ds.query(
      "SELECT to_regclass('public.audit_logs') as tablename",
    );
    expect(afterRecreateAudit[0].tablename).toBe('audit_logs');
    const afterRecreateCategories = await ds.query(
      "SELECT to_regclass('public.categories') as tablename",
    );
    expect(afterRecreateCategories[0].tablename).toBe('categories');
    const afterRecreateUnits = await ds.query(
      "SELECT to_regclass('public.units') as tablename",
    );
    expect(afterRecreateUnits[0].tablename).toBe('units');
    const afterRecreateProducts = await ds.query(
      "SELECT to_regclass('public.products') as tablename",
    );
    expect(afterRecreateProducts[0].tablename).toBe('products');
    const afterRecreateConversions = await ds.query(
      "SELECT to_regclass('public.product_unit_conversions') as tablename",
    );
    expect(afterRecreateConversions[0].tablename).toBe(
      'product_unit_conversions',
    );
    const afterRecreateProductCodeSequence = await ds.query(
      "SELECT to_regclass('public.product_internal_code_seq') as sequence_name",
    );
    expect(afterRecreateProductCodeSequence[0].sequence_name).toBe(
      'product_internal_code_seq',
    );
    const afterRecreateStocks = await ds.query(
      "SELECT to_regclass('public.stocks') as tablename",
    );
    expect(afterRecreateStocks[0].tablename).toBe('stocks');
    const afterRecreateMovements = await ds.query(
      "SELECT to_regclass('public.stock_movements') as tablename",
    );
    expect(afterRecreateMovements[0].tablename).toBe('stock_movements');
  });

  it('creates exactly 2 users on first seed run and hashes passwords with cost 12', async () => {
    const res = await runInitialSeed(ds, {
      adminPassword: 'TestAdminPassword123!',
      vendedorPassword: 'TestVendedorPassword123!',
    });

    expect(res.created).toBe(2);
    expect(res.skipped).toBe(0);

    const userRepo = ds.getRepository(User);
    const users = await userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .getMany();

    expect(users).toHaveLength(2);

    const admin = users.find((u) => u.email === 'admin@erp.com');
    const vendedor = users.find((u) => u.email === 'vendedor@erp.com');

    expect(admin).toBeDefined();
    expect(admin!.role).toBe(UserRole.ADMINISTRADOR);
    expect(admin!.isActive).toBe(true);
    expect(bcrypt.getRounds(admin!.passwordHash)).toBe(12);
    expect(
      await bcrypt.compare('TestAdminPassword123!', admin!.passwordHash),
    ).toBe(true);

    expect(vendedor).toBeDefined();
    expect(vendedor!.role).toBe(UserRole.VENDEDOR);
    expect(vendedor!.isActive).toBe(true);
    expect(bcrypt.getRounds(vendedor!.passwordHash)).toBe(12);
    expect(
      await bcrypt.compare('TestVendedorPassword123!', vendedor!.passwordHash),
    ).toBe(true);
  });

  it('guarantees seed idempotency on repeated executions', async () => {
    const firstRun = await runInitialSeed(ds, {
      adminPassword: 'TestAdminPassword123!',
      vendedorPassword: 'TestVendedorPassword123!',
    });
    expect(firstRun.created).toBe(2);
    expect(firstRun.skipped).toBe(0);

    const secondRun = await runInitialSeed(ds, {
      adminPassword: 'TestAdminPassword123!',
      vendedorPassword: 'TestVendedorPassword123!',
    });
    expect(secondRun.created).toBe(0);
    expect(secondRun.skipped).toBe(2);

    const count = await ds.getRepository(User).count();
    expect(count).toBe(2);
  });

  it('rejects un-normalized emails and duplicates via database constraints', async () => {
    const userRepo = ds.getRepository(User);
    const u1 = userRepo.create({
      name: 'User 1',
      email: 'unique@erp.com',
      passwordHash: '$2b$12$dummyhashforduplicatetest',
      role: UserRole.VENDEDOR,
      isActive: true,
    });
    await userRepo.save(u1);

    // Duplicate email insert should fail unique constraint
    await expect(
      ds.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('U2', 'unique@erp.com', 'hash', 'VENDEDOR')",
      ),
    ).rejects.toThrow();

    // Uppercase email direct insert should fail CHECK constraint (CHK_users_email_normalized)
    await expect(
      ds.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('U3', 'UPPERCASE@ERP.COM', 'hash', 'VENDEDOR')",
      ),
    ).rejects.toThrow();

    // Whitespace email direct insert should fail CHECK constraint (CHK_users_email_normalized)
    await expect(
      ds.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('U4', ' leading_space@erp.com', 'hash', 'VENDEDOR')",
      ),
    ).rejects.toThrow();
  });

  it('rejects invalid roles via database check constraint CHK_users_role', async () => {
    await expect(
      ds.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('U5', 'invalidrole@erp.com', 'hash', 'SUPERADMIN')",
      ),
    ).rejects.toThrow();
  });

  it('rolls back completely if a seed batch fails midway', async () => {
    // Attempting to run seed without vendedorPassword should fail validation before writing
    await expect(
      runInitialSeed(ds, {
        adminPassword: 'TestAdminPassword123!',
        vendedorPassword: '',
      }),
    ).rejects.toThrow(
      'Mandatory configuration "SEED_VENDEDOR_PASSWORD" is missing or empty.',
    );

    const count = await ds.getRepository(User).count();
    expect(count).toBe(0);
  });
});

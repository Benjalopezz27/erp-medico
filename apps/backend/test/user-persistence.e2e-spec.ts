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
    const schemaObjects = [
      '_migrations_check',
      'users',
      'audit_logs',
      'categories',
      'units',
      'products',
      'product_unit_conversions',
      'product_internal_code_seq',
      'stocks',
      'stock_movements',
      'stock_import_batches',
      'quarantine_stocks',
      'suppliers',
      'supplier_products',
      'supplier_import_templates',
      'supplier_import_batches',
      'supplier_import_batch_items',
      'purchase_orders',
      'purchase_order_items',
      'purchase_order_number_seq',
      'goods_receipts',
      'goods_receipt_items',
      'goods_receipt_number_seq',
      'supplier_invoices',
      'supplier_invoice_items',
    ];

    const getSchemaObject = async (
      objectName: string,
    ): Promise<string | null> => {
      const [result] = (await ds.query(
        'SELECT to_regclass($1::text) AS object_name',
        [`public.${objectName}`],
      )) as Array<{ object_name: string | null }>;

      return result.object_name;
    };

    const appliedMigrations = (await ds.query(
      'SELECT "name" FROM "migrations" ORDER BY "timestamp" DESC, "id" DESC',
    )) as Array<{ name: string }>;

    expect(appliedMigrations).not.toHaveLength(0);
    expect(appliedMigrations.map(({ name }) => name)).toContain(
      'CreateGoodsReceiptsTables1700000000015',
    );
    expect(appliedMigrations.map(({ name }) => name)).toContain(
      'CreateSupplierInvoicesTables1700000000016',
    );

    for (let index = 0; index < appliedMigrations.length; index += 1) {
      await ds.undoLastMigration();
    }

    for (const objectName of schemaObjects) {
      await expect(getSchemaObject(objectName)).resolves.toBeNull();
    }

    await ds.runMigrations();

    for (const objectName of schemaObjects) {
      await expect(getSchemaObject(objectName)).resolves.toBe(objectName);
    }
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

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import { StockService } from '../src/modules/stock/stock.service';
import { StockMovementType } from '@erp/shared-types';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Stock Persistence, Ledger Immutability & Search Projection (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminUser: User;
  let adminToken: string;
  let testCategory: Category;
  let testBaseUnit: Unit;
  let testProduct: Product;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    await runInitialSeed(ds, {
      adminEmail: 'stock-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'stock-vendedor@erp.com',
      vendedorPassword: 'VendedorPassword123!',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    stockService = app.get<StockService>(StockService);

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'stock-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'stock-admin@erp.com',
    })) as User;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('TRUNCATE TABLE stock_movements CASCADE');
    await queryRunner.query('TRUNCATE TABLE stocks CASCADE');
    await queryRunner.query('TRUNCATE TABLE product_unit_conversions CASCADE');
    await queryRunner.query('TRUNCATE TABLE products CASCADE');
    await queryRunner.query('TRUNCATE TABLE categories CASCADE');
    await queryRunner.query('TRUNCATE TABLE units CASCADE');

    // 1. Create Category & Unit
    testCategory = queryRunner.manager.create(Category, {
      name: 'Farmacia',
    });
    await queryRunner.manager.save(Category, testCategory);

    testBaseUnit = queryRunner.manager.create(Unit, {
      name: 'Unidad',
      symbol: 'u',
    });
    await queryRunner.manager.save(Unit, testBaseUnit);

    // 2. Create Product
    testProduct = queryRunner.manager.create(Product, {
      internalCode: 'P0001',
      name: 'Paracetamol 500mg',
      categoryId: testCategory.id,
      baseUnitId: testBaseUnit.id,
      minStock: 50,
      costNet: 100,
      suggestedPriceNet: 140,
      activePriceNet: 140,
    });
    await queryRunner.manager.save(Product, testProduct);

    // 3. Create initial Stock row
    const initialStock = queryRunner.manager.create(Stock, {
      productId: testProduct.id,
      currentBaseStock: '0.00',
    });
    await queryRunner.manager.save(Stock, initialStock);

    await queryRunner.release();
  });

  describe('Ledger consistency and mathematical invariants', () => {
    it('records sequential movements and keeps stocks.current_base_stock consistent with subsequentStock', async () => {
      // 1. Initial balance is 0.00
      const initialStock = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(initialStock.currentBaseStock).toBe(0);

      // 2. Inward: Purchase 100 units
      const mov1 = await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 100.0,
        reason: 'Recepción OC-1001',
        documentReference: 'REM-001',
        userId: adminUser.id,
      });

      expect(mov1.previousStock).toBe(0.0);
      expect(mov1.quantityBase).toBe(100.0);
      expect(mov1.subsequentStock).toBe(100.0);

      const stockAfter1 = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(stockAfter1.currentBaseStock).toBe(100.0);

      // 3. Outward: Sale 25.50 units
      const mov2 = await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 25.5,
        reason: 'Factura Venta #101',
        documentReference: 'FAC-B-0001-00000001',
        userId: adminUser.id,
      });

      expect(mov2.previousStock).toBe(100.0);
      expect(mov2.quantityBase).toBe(25.5);
      expect(mov2.subsequentStock).toBe(74.5);

      const stockAfter2 = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(stockAfter2.currentBaseStock).toBe(74.5);

      // 4. Outward: Merma 4.50 units
      const mov3 = await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.MERMA,
        quantityBase: 4.5,
        reason: 'Caja dañada',
        userId: adminUser.id,
      });

      expect(mov3.previousStock).toBe(74.5);
      expect(mov3.subsequentStock).toBe(70.0);

      const stockAfter3 = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(stockAfter3.currentBaseStock).toBe(70.0);

      // 5. Verify all movements stored in database match subsequentStock
      const movementsInDb = await ds.getRepository(StockMovement).find({
        where: { productId: testProduct.id },
        order: { createdAt: 'ASC' },
      });

      expect(movementsInDb).toHaveLength(3);
      expect(Number(movementsInDb[0].subsequentStock)).toBe(100.0);
      expect(Number(movementsInDb[1].subsequentStock)).toBe(74.5);
      expect(Number(movementsInDb[2].subsequentStock)).toBe(70.0);
    });
  });

  describe('PostgreSQL Immutability Trigger Protection', () => {
    it('prevents direct raw SQL UPDATE on stock_movements via database trigger', async () => {
      const mov = await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 50.0,
        reason: 'Ingreso inicial',
        userId: adminUser.id,
      });

      const qr = ds.createQueryRunner();
      await qr.connect();

      await expect(
        qr.query(
          `UPDATE stock_movements SET quantity_base = 999.00 WHERE id = $1`,
          [mov.id],
        ),
      ).rejects.toThrow(/Stock movements are immutable/i);

      await qr.release();
    });

    it('prevents direct raw SQL DELETE on stock_movements via database trigger', async () => {
      const mov = await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 50.0,
        reason: 'Ingreso inicial',
        userId: adminUser.id,
      });

      const qr = ds.createQueryRunner();
      await qr.connect();

      await expect(
        qr.query(`DELETE FROM stock_movements WHERE id = $1`, [mov.id]),
      ).rejects.toThrow(/Stock movements are immutable/i);

      await qr.release();
    });
  });

  describe('Transactional atomicity & rollback', () => {
    it('rolls back both stock balance and stock_movements when transaction fails after recording movement', async () => {
      const initialStock = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(initialStock.currentBaseStock).toBe(0);

      await expect(
        ds.transaction(async (txManager) => {
          await stockService.recordMovement(
            {
              productId: testProduct.id,
              movementType: StockMovementType.ENTRADA_COMPRA,
              quantityBase: 80.0,
              reason: 'Ingreso que fallará después',
              userId: adminUser.id,
            },
            txManager,
          );

          // Force an unexpected error in the caller transaction
          throw new Error('Simulated transaction failure');
        }),
      ).rejects.toThrow('Simulated transaction failure');

      // Assert balance was NOT changed
      const stockAfterRollback = await stockService.getStockByProductId(
        testProduct.id,
      );
      expect(stockAfterRollback.currentBaseStock).toBe(0);

      // Assert no movement was persisted
      const movementsCount = await ds.getRepository(StockMovement).count({
        where: { productId: testProduct.id },
      });
      expect(movementsCount).toBe(0);
    });
  });

  describe('Foreign key and Check constraints', () => {
    it('rejects deleting a product with existing stock movements due to ON DELETE RESTRICT', async () => {
      await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 10.0,
        reason: 'Stock de prueba',
        userId: adminUser.id,
      });

      const qr = ds.createQueryRunner();
      await qr.connect();

      await expect(
        qr.query(`DELETE FROM products WHERE id = $1`, [testProduct.id]),
      ).rejects.toThrow(/violates foreign key constraint/i);

      await qr.release();
    });

    it('rejects inserting non-positive quantityBase at database level', async () => {
      const qr = ds.createQueryRunner();
      await qr.connect();

      await expect(
        qr.query(
          `INSERT INTO stock_movements (id, product_id, movement_type, quantity_base, previous_stock, subsequent_stock, reason, user_id)
           VALUES (gen_random_uuid(), $1, 'ENTRADA_COMPRA', 0.00, 0.00, 0.00, 'Test zero', $2)`,
          [testProduct.id, adminUser.id],
        ),
      ).rejects.toThrow(/CHK_stock_movements_quantity_positive/i);

      await qr.release();
    });
  });

  describe('Product Search Typeahead Real Stock Projection', () => {
    it('projects currentStock = 0 for product with no movements, and real balance after movement', async () => {
      // 1. Initial search projection is 0
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/products/search?q=P0001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res1.body).toHaveLength(1);
      expect(res1.body[0].internalCode).toBe('P0001');
      expect(res1.body[0].currentStock).toBe(0);

      // 2. Record 150.75 units entry
      await stockService.recordMovement({
        productId: testProduct.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 150.75,
        reason: 'Ingreso para prueba de typeahead',
        userId: adminUser.id,
      });

      // 3. Search again, should return 150.75
      const res2 = await request(app.getHttpServer())
        .get('/api/v1/products/search?q=P0001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res2.body).toHaveLength(1);
      expect(res2.body[0].currentStock).toBe(150.75);
    });
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.query(
        'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
      );
      await qr.release();
      await ds.destroy();
    }
    if (app) {
      await app.close();
    }
  });
});

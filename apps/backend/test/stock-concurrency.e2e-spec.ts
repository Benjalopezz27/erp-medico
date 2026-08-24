import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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
import { InsufficientStockException } from '../src/modules/stock/exceptions';

describe('Stock Concurrency, Non-Negative Ledger & Lock Determinism (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminUser: User;
  let testCategory: Category;
  let testBaseUnit: Unit;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query(
      'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'stock-concurrency-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'stock-concurrency-vendedor@erp.com',
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

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'stock-concurrency-admin@erp.com',
    }))!;

    const categoryRepo = ds.getRepository(Category);
    testCategory = await categoryRepo.save(
      categoryRepo.create({
        name: 'Inyectables y Soluciones Concurrencia',
        description: 'Categoría para pruebas concurrentes de stock',
      }),
    );

    const unitRepo = ds.getRepository(Unit);
    testBaseUnit = await unitRepo.save(
      unitRepo.create({
        name: 'Frasco',
        symbol: 'fr',
      }),
    );
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

  const createTestProduct = async (
    name: string,
    initialStock = 0,
  ): Promise<Product> => {
    const productRepo = ds.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name,
        categoryId: testCategory.id,
        baseUnitId: testBaseUnit.id,
        costNet: '100.00',
        activePriceNet: '150.00',
        minStock: '10.00',
      }),
    );

    await ds.getRepository(Stock).save({
      productId: product.id,
      currentBaseStock: '0.00',
    });

    if (initialStock > 0) {
      await stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: initialStock,
        reason: 'Carga inicial de stock',
        userId: adminUser.id,
      });
    }

    return product;
  };

  describe('Case A: Two Competing Incompatible Deductions (Initial: 10, Deduct: 7 & 7)', () => {
    it('serializes deductions so exactly one succeeds and one fails with 422, leaving stock at 3', async () => {
      const product = await createTestProduct(
        'Producto Salidas Competitivas',
        10,
      );

      const op1 = stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 7,
        reason: 'Venta concurrente 1',
        userId: adminUser.id,
      });

      const op2 = stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 7,
        reason: 'Venta concurrente 2',
        userId: adminUser.id,
      });

      const results = await Promise.allSettled([op1, op2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Verify the rejected error is InsufficientStockException (HTTP 422)
      const rejectionError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionError).toBeInstanceOf(InsufficientStockException);
      expect(rejectionError.getStatus()).toBe(422);
      expect(rejectionError.getResponse()).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'INSUFFICIENT_STOCK',
        message: 'Stock insuficiente para completar la operación.',
        details: {
          productId: product.id,
          available: 3,
          requested: 7,
        },
      });

      // Verify DB final balance is 3.00
      const stockRow = await ds
        .getRepository(Stock)
        .findOneBy({ productId: product.id });
      expect(parseFloat(stockRow!.currentBaseStock.toString())).toBe(3);

      // Verify movements ledger (1 entry + 1 successful sale = 2 movements total)
      const movements = await ds.getRepository(StockMovement).find({
        where: { productId: product.id },
        order: { createdAt: 'ASC', id: 'ASC' },
      });

      expect(movements).toHaveLength(2);
      expect(movements[0].movementType).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(parseFloat(movements[0].subsequentStock.toString())).toBe(10);
      expect(movements[1].movementType).toBe(StockMovementType.SALIDA_VENTA);
      expect(parseFloat(movements[1].previousStock.toString())).toBe(10);
      expect(parseFloat(movements[1].subsequentStock.toString())).toBe(3);
    });
  });

  describe('Case B: Concurrent Additions (Initial: 0, Add: 20 & 30)', () => {
    it('eliminates lost updates and reaches exact total of 50 with continuous ledger', async () => {
      const product = await createTestProduct(
        'Producto Entradas Concurrentes',
        0,
      );

      const op1 = stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 20,
        reason: 'Ingreso lote A',
        userId: adminUser.id,
      });

      const op2 = stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 30,
        reason: 'Ingreso lote B',
        userId: adminUser.id,
      });

      const results = await Promise.allSettled([op1, op2]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

      // Final stock must be exactly 50
      const stockRow = await ds
        .getRepository(Stock)
        .findOneBy({ productId: product.id });
      expect(parseFloat(stockRow!.currentBaseStock.toString())).toBe(50);

      // Verify ledger continuity
      const movements = await ds.getRepository(StockMovement).find({
        where: { productId: product.id },
      });

      expect(movements).toHaveLength(2);
      movements.sort(
        (a, b) =>
          parseFloat(a.previousStock.toString()) -
          parseFloat(b.previousStock.toString()),
      );
      expect(parseFloat(movements[0].previousStock.toString())).toBe(0);
      expect(movements[1].previousStock).toBe(movements[0].subsequentStock);
      expect(parseFloat(movements[1].subsequentStock.toString())).toBe(50);
    });
  });

  describe('Case C: Deduction Equal to Available Stock', () => {
    it('allows withdrawing entire available stock reducing balance to exact zero', async () => {
      const product = await createTestProduct('Producto Reduccion a Cero', 10);

      const res = await stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 10,
        reason: 'Venta total remanente',
        userId: adminUser.id,
      });

      expect(res.previousStock).toBe(10);
      expect(res.subsequentStock).toBe(0);

      const stockRow = await ds
        .getRepository(Stock)
        .findOneBy({ productId: product.id });
      expect(parseFloat(stockRow!.currentBaseStock.toString())).toBe(0);
    });
  });

  describe('Case D: Direct PostgreSQL Check Constraint Enforcement', () => {
    it('rejects direct negative stock update with error 23514 (check constraint violation)', async () => {
      const product = await createTestProduct('Producto Constraint Directo', 5);

      let databaseErrorCode = '';
      try {
        await ds.query(
          `UPDATE "stocks" SET "current_base_stock" = -1.00 WHERE "product_id" = $1;`,
          [product.id],
        );
      } catch (err: any) {
        databaseErrorCode = err?.code || err?.driverError?.code;
      }

      expect(databaseErrorCode).toBe('23514');
    });
  });

  describe('Case E: Deterministic Rollback and Lock Release via pg_stat_activity', () => {
    it('observes row lock wait deterministically, unblocking transaction B on rollback of transaction A', async () => {
      const product = await createTestProduct(
        'Producto Determinismo Rollback',
        10,
      );

      const runnerA = ds.createQueryRunner();
      const runnerB = ds.createQueryRunner();
      const observerRunner = ds.createQueryRunner();

      await runnerA.connect();
      await runnerB.connect();
      await observerRunner.connect();

      try {
        // 1. Transaction A starts and records movement without committing
        await runnerA.startTransaction();
        await stockService.recordMovement(
          {
            productId: product.id,
            movementType: StockMovementType.SALIDA_VENTA,
            quantityBase: 5,
            reason: 'Venta tentativa A',
            userId: adminUser.id,
          },
          runnerA.manager,
        );

        // 2. Obtain Connection B's PostgreSQL PID
        const pidRes = await runnerB.query('SELECT pg_backend_pid() as pid;');
        const pidB = pidRes[0].pid;

        // 3. Start Transaction B and execute recordMovement in the background (will block on row lock)
        await runnerB.startTransaction();
        const promiseB = stockService.recordMovement(
          {
            productId: product.id,
            movementType: StockMovementType.SALIDA_VENTA,
            quantityBase: 5,
            reason: 'Venta concurrente B',
            userId: adminUser.id,
          },
          runnerB.manager,
        );

        // 4. Observer connection polls pg_stat_activity until Connection B is confirmed waiting on Lock
        let isWaitingOnLock = false;
        const startTime = Date.now();
        const timeoutMs = 4000;

        while (Date.now() - startTime < timeoutMs) {
          const activityRes = await observerRunner.query(
            `SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid = $1;`,
            [pidB],
          );

          if (
            activityRes.length > 0 &&
            activityRes[0].wait_event_type === 'Lock'
          ) {
            isWaitingOnLock = true;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        expect(isWaitingOnLock).toBe(true);

        // 5. Transaction A rolls back -> lock is released
        await runnerA.rollbackTransaction();

        // 6. Transaction B unblocks, reads original balance (10), writes 5, and resolves
        const resB = await promiseB;
        await runnerB.commitTransaction();

        expect(resB.previousStock).toBe(10);
        expect(resB.subsequentStock).toBe(5);

        // Verify final DB state has only Connection B's movement
        const stockRow = await ds
          .getRepository(Stock)
          .findOneBy({ productId: product.id });
        expect(parseFloat(stockRow!.currentBaseStock.toString())).toBe(5);

        const movements = await ds.getRepository(StockMovement).find({
          where: { productId: product.id },
        });

        // 1 initial entry (10) + 1 sale from B (5) = 2 movements total
        expect(movements).toHaveLength(2);
        const saleMovements = movements.filter(
          (m) => m.movementType === StockMovementType.SALIDA_VENTA,
        );
        expect(saleMovements).toHaveLength(1);
        expect(saleMovements[0].reason).toBe('Venta concurrente B');
      } finally {
        await runnerA.release();
        await runnerB.release();
        await observerRunner.release();
      }
    });
  });

  describe('Case F: Product-Level Row Lock Independence with lock_timeout', () => {
    it('allows concurrent transactions on distinct products to proceed without blocking', async () => {
      const product1 = await createTestProduct('Producto Independiente 1', 10);
      const product2 = await createTestProduct('Producto Independiente 2', 10);

      const runnerA = ds.createQueryRunner();
      const runnerB = ds.createQueryRunner();

      await runnerA.connect();
      await runnerB.connect();

      try {
        // Transaction A locks Product 1
        await runnerA.startTransaction();
        await stockService.recordMovement(
          {
            productId: product1.id,
            movementType: StockMovementType.SALIDA_VENTA,
            quantityBase: 3,
            reason: 'Venta Producto 1',
            userId: adminUser.id,
          },
          runnerA.manager,
        );

        // Transaction B sets a very short lock timeout and operates on Product 2
        await runnerB.startTransaction();
        await runnerB.query(`SET LOCAL lock_timeout = '200ms';`);

        const resB = await stockService.recordMovement(
          {
            productId: product2.id,
            movementType: StockMovementType.SALIDA_VENTA,
            quantityBase: 4,
            reason: 'Venta Producto 2',
            userId: adminUser.id,
          },
          runnerB.manager,
        );

        await runnerB.commitTransaction();
        await runnerA.commitTransaction();

        expect(resB.previousStock).toBe(10);
        expect(resB.subsequentStock).toBe(6);
      } finally {
        await runnerA.release();
        await runnerB.release();
      }
    });
  });
});

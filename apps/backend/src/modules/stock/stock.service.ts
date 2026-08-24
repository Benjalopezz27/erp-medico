import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { ProductStatus, StockStatus } from '@erp/shared-types';
import { InsufficientStockException } from './exceptions';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  RecordStockMovementDto,
  StockResponseDto,
  StockMovementResponseDto,
  QueryStockDto,
  PaginatedStockResponseDto,
  StockOverviewItemResponseDto,
  QueryStockMovementsDto,
  PaginatedStockMovementsResponseDto,
  QueryStockEvolutionDto,
  StockEvolutionResponseDto,
  StockEvolutionPointDto,
  QueryStockAlertsDto,
} from './dto';
import {
  getStockMovementSign,
  parseStockDecimal,
  deriveStockStatus,
} from './utils/stock-math.utils';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'stock', status: 'initialized' };
  }

  /**
   * Builds the base QueryBuilder for active products and stock balances.
   */
  private buildStockBaseQuery(options: {
    search?: string;
    categoryId?: string;
    stockStatus?: StockStatus;
    alertsOnly?: boolean;
  }) {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.category', 'category')
      .innerJoin('product.baseUnit', 'baseUnit')
      .leftJoin('product.stock', 'stock')
      .select([
        'product.id',
        'product.internalCode',
        'product.name',
        'product.status',
        'product.minStock',
        'category.id',
        'category.name',
        'baseUnit.id',
        'baseUnit.name',
        'baseUnit.symbol',
        'stock.id',
        'stock.currentBaseStock',
      ])
      .where('product.status = :status', { status: ProductStatus.ACTIVE });

    if (options.search && options.search.trim().length > 0) {
      const escaped = options.search.trim().replace(/[%_\\]/g, '\\$&');
      qb.andWhere(
        '(UPPER(product.internalCode) LIKE UPPER(:searchLike) OR product.name ILIKE :searchLike)',
        { searchLike: `%${escaped}%` },
      );
    }

    if (options.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    if (options.alertsOnly) {
      // Invariant: currentBaseStock <= minStock
      qb.andWhere('COALESCE(stock.current_base_stock, 0) <= product.min_stock');
    } else if (options.stockStatus) {
      if (options.stockStatus === StockStatus.CRITICAL) {
        qb.andWhere('COALESCE(stock.current_base_stock, 0) <= 0');
      } else if (options.stockStatus === StockStatus.LOW) {
        qb.andWhere(
          'COALESCE(stock.current_base_stock, 0) > 0 AND COALESCE(stock.current_base_stock, 0) <= product.min_stock',
        );
      } else if (options.stockStatus === StockStatus.NORMAL) {
        qb.andWhere(
          'COALESCE(stock.current_base_stock, 0) > product.min_stock',
        );
      }
    }

    return qb;
  }

  private mapProductToOverviewItem(
    product: Product,
  ): StockOverviewItemResponseDto {
    const currentBaseStock = product.stock
      ? parseStockDecimal(product.stock.currentBaseStock, 2)
      : 0;
    const minStock = parseStockDecimal(product.minStock, 2);

    return {
      productId: product.id,
      internalCode: product.internalCode,
      productName: product.name,
      category: {
        id: product.category?.id || product.categoryId,
        name: product.category?.name || '',
      },
      baseUnit: {
        id: product.baseUnit?.id || product.baseUnitId,
        name: product.baseUnit?.name || '',
        symbol: product.baseUnit?.symbol || '',
      },
      currentBaseStock,
      minStock,
      stockStatus: deriveStockStatus(currentBaseStock, minStock),
      status: product.status,
    };
  }

  /**
   * Queries active products with consolidated base stock, thresholds, and health status.
   * Performs an explicit SQL SELECT projection preventing any cost or markup financial leaks.
   */
  async findAllStock(query: QueryStockDto): Promise<PaginatedStockResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const offset = (page - 1) * limit;

    const qb = this.buildStockBaseQuery(query);
    qb.orderBy('product.name', 'ASC').addOrderBy('product.id', 'ASC');
    qb.skip(offset).take(limit);

    const [products, total] = await qb.getManyAndCount();
    const items = products.map((product) =>
      this.mapProductToOverviewItem(product),
    );
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Queries active products with stock balance at or below minimum threshold (currentBaseStock <= minStock).
   */
  async findStockAlerts(
    query: QueryStockAlertsDto,
  ): Promise<PaginatedStockResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const offset = (page - 1) * limit;

    const qb = this.buildStockBaseQuery({ ...query, alertsOnly: true });
    qb.orderBy('product.name', 'ASC').addOrderBy('product.id', 'ASC');
    qb.skip(offset).take(limit);

    const [products, total] = await qb.getManyAndCount();
    const items = products.map((product) =>
      this.mapProductToOverviewItem(product),
    );
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retrieves the paginated immutable movement ledger of a specific product.
   * Allows historical auditing even if the product is INACTIVE.
   */
  async findProductMovements(
    productId: string,
    query: QueryStockMovementsDto,
  ): Promise<PaginatedStockMovementsResponseDto> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.category', 'category')
      .innerJoinAndSelect('product.baseUnit', 'baseUnit')
      .leftJoinAndSelect('product.stock', 'stock')
      .select([
        'product.id',
        'product.internalCode',
        'product.name',
        'product.status',
        'product.minStock',
        'category.id',
        'category.name',
        'baseUnit.id',
        'baseUnit.name',
        'baseUnit.symbol',
        'stock.id',
        'stock.currentBaseStock',
      ])
      .where('product.id = :productId', { productId })
      .getOne();

    if (!product) {
      throw new NotFoundException('El producto especificado no existe.');
    }

    if (query.from && query.to) {
      const fromTime = new Date(query.from).getTime();
      const toTime = new Date(query.to).getTime();
      if (isNaN(fromTime) || isNaN(toTime) || fromTime > toTime) {
        throw new BadRequestException(
          "La fecha 'from' no puede ser posterior a 'to'.",
        );
      }
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const offset = (page - 1) * limit;

    const qb = this.movementRepository
      .createQueryBuilder('movement')
      .innerJoin('movement.user', 'user')
      .select([
        'movement.id',
        'movement.productId',
        'movement.movementType',
        'movement.quantityBase',
        'movement.previousStock',
        'movement.subsequentStock',
        'movement.reason',
        'movement.documentReference',
        'movement.createdAt',
        'user.id',
        'user.name',
      ])
      .where('movement.productId = :productId', { productId });

    if (query.movementType) {
      qb.andWhere('movement.movementType = :movementType', {
        movementType: query.movementType,
      });
    }

    if (query.from) {
      qb.andWhere('movement.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('movement.createdAt <= :to', { to: query.to });
    }

    qb.orderBy('movement.createdAt', 'DESC').addOrderBy('movement.id', 'DESC');
    qb.skip(offset).take(limit);

    const [movements, total] = await qb.getManyAndCount();

    const currentBaseStock = product.stock
      ? parseStockDecimal(product.stock.currentBaseStock, 2)
      : 0;
    const minStock = parseStockDecimal(product.minStock, 2);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      product: {
        productId: product.id,
        internalCode: product.internalCode,
        productName: product.name,
        status: product.status,
        category: {
          id: product.category?.id || product.categoryId,
          name: product.category?.name || '',
        },
        baseUnit: {
          id: product.baseUnit?.id || product.baseUnitId,
          name: product.baseUnit?.name || '',
          symbol: product.baseUnit?.symbol || '',
        },
        currentBaseStock,
        minStock,
        stockStatus: deriveStockStatus(currentBaseStock, minStock),
      },
      items: movements.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        quantityBase: parseStockDecimal(m.quantityBase, 2),
        previousStock: parseStockDecimal(m.previousStock, 2),
        subsequentStock: parseStockDecimal(m.subsequentStock, 2),
        reason: m.reason,
        documentReference: m.documentReference,
        user: {
          id: m.user?.id || m.userId,
          name: m.user?.name || 'Sistema',
        },
        createdAt: m.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Retrieves bounded time-series stock evolution points for Recharts.
   * Queries latest movements descending, detects truncation, slices limit,
   * and reverses chronologically ascending with accurate baseline balance calculation.
   */
  async findStockEvolution(
    productId: string,
    query: QueryStockEvolutionDto,
  ): Promise<StockEvolutionResponseDto> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.stock', 'stock')
      .select([
        'product.id',
        'product.minStock',
        'stock.id',
        'stock.currentBaseStock',
      ])
      .where('product.id = :productId', { productId })
      .getOne();

    if (!product) {
      throw new NotFoundException('El producto especificado no existe.');
    }

    if (query.from && query.to) {
      const fromTime = new Date(query.from).getTime();
      const toTime = new Date(query.to).getTime();
      if (isNaN(fromTime) || isNaN(toTime) || fromTime > toTime) {
        throw new BadRequestException(
          "La fecha 'from' no puede ser posterior a 'to'.",
        );
      }
    }

    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 50;

    const qb = this.movementRepository
      .createQueryBuilder('movement')
      .select([
        'movement.id',
        'movement.movementType',
        'movement.quantityBase',
        'movement.previousStock',
        'movement.subsequentStock',
        'movement.createdAt',
      ])
      .where('movement.productId = :productId', { productId });

    if (query.from) {
      qb.andWhere('movement.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('movement.createdAt <= :to', { to: query.to });
    }

    qb.orderBy('movement.createdAt', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .take(limit + 1);

    const movements = await qb.getMany();
    const isTruncated = movements.length > limit;
    const slice = isTruncated ? movements.slice(0, limit) : movements;

    // Reverse to chronological ascending
    slice.reverse();

    const minStock = parseStockDecimal(product.minStock, 2);
    const points: StockEvolutionPointDto[] = [];
    let effectiveFrom: string | null = null;
    let effectiveTo: string | null = null;

    if (slice.length > 0) {
      effectiveFrom = slice[0].createdAt.toISOString();
      effectiveTo = slice[slice.length - 1].createdAt.toISOString();

      // Initial baseline from previousStock of first movement in slice
      const initialBaseline = parseStockDecimal(slice[0].previousStock, 2);
      points.push({
        timestamp: slice[0].createdAt.toISOString(),
        balance: initialBaseline,
        event: 'BASELINE',
        quantity: 0,
      });

      for (const m of slice) {
        points.push({
          timestamp: m.createdAt.toISOString(),
          balance: parseStockDecimal(m.subsequentStock, 2),
          event: m.movementType,
          quantity: parseStockDecimal(m.quantityBase, 2),
        });
      }
    } else {
      effectiveFrom = query.from || null;
      effectiveTo = query.to || null;
    }

    return {
      productId: product.id,
      minStock,
      truncated: isTruncated,
      effectiveFrom,
      effectiveTo,
      points,
    };
  }

  /**
   * Authoritatively records a stock movement, calculates resulting balances with Decimal.js,
   * updates the materialized Stock record, and creates the immutable StockMovement entry.
   *
   * Participates in an existing transaction if `manager` is supplied; otherwise wraps execution
   * in a self-contained TypeORM transaction.
   */
  async recordMovement(
    dto: RecordStockMovementDto,
    manager?: EntityManager,
  ): Promise<StockMovementResponseDto> {
    // 1. Input Validation
    if (dto.quantityBase === undefined || dto.quantityBase === null) {
      throw new BadRequestException(
        'La cantidad en unidad base es obligatoria.',
      );
    }

    const decQty = new Decimal(dto.quantityBase);
    if (!decQty.isFinite() || decQty.lte(0)) {
      throw new BadRequestException(
        'La cantidad en unidad base debe ser un número positivo mayor a cero.',
      );
    }

    if (decQty.decimalPlaces() > 2) {
      throw new BadRequestException(
        'La cantidad en unidad base no puede tener más de 2 decimales.',
      );
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException(
        'El motivo del movimiento es obligatorio y no puede estar vacío.',
      );
    }

    // 2. Transaction Active Validation for External EntityManager
    if (manager) {
      if (!manager.queryRunner || !manager.queryRunner.isTransactionActive) {
        throw new InternalServerErrorException(
          'StockService.recordMovement requires an active transaction when an external EntityManager is supplied.',
        );
      }
    }

    // 3. Transaction Execution
    const executeInTransaction = async (
      txManager: EntityManager,
    ): Promise<StockMovementResponseDto> => {
      // Verify user exists
      const user = await txManager.findOneBy(User, { id: dto.userId });
      if (!user) {
        throw new NotFoundException('El usuario especificado no existe.');
      }

      // Acquire pessimistic write lock (FOR UPDATE) and fresh balance
      const stock = await this.lockStockForUpdate(dto.productId, txManager);

      // Derive delta sign (+1 for inward, -1 for outward)
      const sign = getStockMovementSign(dto.movementType);
      const delta = decQty.times(sign);

      const previousStockDec = new Decimal(stock.currentBaseStock);
      const subsequentStockDec = previousStockDec
        .plus(delta)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      // Guard: Non-negative stock balance (HTTP 422)
      if (subsequentStockDec.isNegative()) {
        throw new InsufficientStockException({
          productId: dto.productId,
          available: parseStockDecimal(previousStockDec.toString(), 2),
          requested: parseStockDecimal(decQty.toString(), 2),
        });
      }

      // Guard: Upper numeric bound ceiling (HTTP 422)
      if (subsequentStockDec.greaterThan('999999999999.99')) {
        throw new UnprocessableEntityException(
          'El saldo resultante supera el límite máximo permitido de 999.999.999.999,99 unidades.',
        );
      }

      // Update materialized balance
      stock.currentBaseStock = subsequentStockDec.toFixed(2);
      await txManager.save(Stock, stock);

      // Create immutable movement entry
      const movement = txManager.create(StockMovement, {
        productId: dto.productId,
        movementType: dto.movementType,
        quantityBase: decQty.toFixed(2),
        previousStock: previousStockDec.toFixed(2),
        subsequentStock: subsequentStockDec.toFixed(2),
        reason: dto.reason.trim(),
        documentReference:
          dto.documentReference && dto.documentReference.trim().length > 0
            ? dto.documentReference.trim()
            : null,
        userId: dto.userId,
      });

      const savedMovement = await txManager.save(StockMovement, movement);

      return {
        id: savedMovement.id,
        productId: savedMovement.productId,
        movementType: savedMovement.movementType,
        quantityBase: parseStockDecimal(savedMovement.quantityBase, 2),
        previousStock: parseStockDecimal(savedMovement.previousStock, 2),
        subsequentStock: parseStockDecimal(savedMovement.subsequentStock, 2),
        reason: savedMovement.reason,
        documentReference: savedMovement.documentReference,
        userId: savedMovement.userId,
        createdAt: savedMovement.createdAt,
      };
    };

    if (manager) {
      return executeInTransaction(manager);
    }

    return this.dataSource.transaction(async (txManager) => {
      return executeInTransaction(txManager);
    });
  }

  /**
   * Retrieves the current consolidated stock balance for a product.
   */
  async getStockByProductId(
    productId: string,
    manager?: EntityManager,
  ): Promise<StockResponseDto> {
    const stock = await this.ensureStockExists(productId, manager);
    return {
      id: stock.id,
      productId: stock.productId,
      currentBaseStock: parseStockDecimal(stock.currentBaseStock, 2),
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
    };
  }

  /**
   * Acquires a pessimistic write lock (FOR UPDATE) on the product's Stock row.
   * Optimized hot-path: attempts lock query first (1 single DB query for existing records);
   * only executes verification and ON CONFLICT DO NOTHING insertion if the row does not yet exist.
   */
  async lockStockForUpdate(
    productId: string,
    manager: EntityManager,
  ): Promise<Stock> {
    // 1. Hot Path: Attempt direct row lock
    let stock = await manager
      .createQueryBuilder(Stock, 'stock')
      .setLock('pessimistic_write')
      .where('stock.productId = :productId', { productId })
      .getOne();

    if (stock) {
      return stock;
    }

    // 2. Cold Path: Verify Product existence before creating stock row
    const product = await manager.findOneBy(Product, { id: productId });
    if (!product) {
      throw new NotFoundException('El producto especificado no existe.');
    }

    // 3. Explicit parameterized ON CONFLICT DO NOTHING insert
    await manager.query(
      `INSERT INTO "stocks" ("id", "product_id", "current_base_stock", "created_at", "updated_at")
       VALUES (gen_random_uuid(), $1, '0.00', now(), now())
       ON CONFLICT ("product_id") DO NOTHING;`,
      [productId],
    );

    // 4. Re-query with pessimistic write lock
    stock = await manager
      .createQueryBuilder(Stock, 'stock')
      .setLock('pessimistic_write')
      .where('stock.productId = :productId', { productId })
      .getOne();

    if (!stock) {
      throw new InternalServerErrorException(
        'No se pudo bloquear el saldo de stock para el producto.',
      );
    }

    return stock;
  }

  /**
   * Ensures a Stock balance record exists for the given product.
   * If not found, verifies product existence and creates a new row with 0.00 base stock
   * using parameterized ON CONFLICT DO NOTHING.
   */
  async ensureStockExists(
    productId: string,
    manager?: EntityManager,
  ): Promise<Stock> {
    const activeManager = manager || this.dataSource.manager;

    const existingStock = await activeManager.findOneBy(Stock, {
      productId,
    });

    if (existingStock) {
      return existingStock;
    }

    // Verify Product exists
    const product = await activeManager.findOneBy(Product, { id: productId });
    if (!product) {
      throw new NotFoundException('El producto especificado no existe.');
    }

    // Insert idempotently without unique constraint violation error
    await activeManager.query(
      `INSERT INTO "stocks" ("id", "product_id", "current_base_stock", "created_at", "updated_at")
       VALUES (gen_random_uuid(), $1, '0.00', now(), now())
       ON CONFLICT ("product_id") DO NOTHING;`,
      [productId],
    );

    const createdStock = await activeManager.findOneBy(Stock, { productId });
    if (!createdStock) {
      throw new InternalServerErrorException(
        'No se pudo inicializar el registro de stock para el producto.',
      );
    }
    return createdStock;
  }
}

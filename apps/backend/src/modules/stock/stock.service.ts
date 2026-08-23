import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  RecordStockMovementDto,
  StockResponseDto,
  StockMovementResponseDto,
} from './dto';
import {
  getStockMovementSign,
  parseStockDecimal,
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

    // 2. Transaction Execution
    const executeInTransaction = async (
      txManager: EntityManager,
    ): Promise<StockMovementResponseDto> => {
      // Verify user exists
      const user = await txManager.findOneBy(User, { id: dto.userId });
      if (!user) {
        throw new NotFoundException('El usuario especificado no existe.');
      }

      // Ensure stock record exists for product
      const stock = await this.ensureStockExists(dto.productId, txManager);

      // Derive delta sign (+1 for inward, -1 for outward)
      const sign = getStockMovementSign(dto.movementType);
      const delta = decQty.times(sign);

      const previousStockDec = new Decimal(stock.currentBaseStock);
      const subsequentStockDec = previousStockDec
        .plus(delta)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

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
   * Ensures a Stock balance record exists for the given product.
   * If not found, verifies product existence and creates a new row with 0.00 base stock.
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

    try {
      const newStock = activeManager.create(Stock, {
        productId,
        currentBaseStock: '0.00',
      });
      return await activeManager.save(Stock, newStock);
    } catch (err: any) {
      // In case of a race condition on UNIQUE(product_id), fetch the created row
      const createdStock = await activeManager.findOneBy(Stock, { productId });
      if (createdStock) {
        return createdStock;
      }
      throw err;
    }
  }
}

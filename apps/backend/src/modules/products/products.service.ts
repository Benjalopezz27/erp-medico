import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserRole, ProductStatus, StockMovementType } from '@erp/shared-types';
import Decimal from 'decimal.js';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { Stock } from '../stock/entities/stock.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { UpdateProductUnitConversionDto } from './dto/update-product-unit-conversion.dto';
import { ProductAdminResponseDto } from './dto/product-admin-response.dto';
import { ProductSellerResponseDto } from './dto/product-seller-response.dto';
import { ProductSummaryResponseDto } from './dto/product-summary-response.dto';
import { ProductUnitConversionResponseDto } from './dto/product-unit-conversion-response.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import {
  PaginatedProductsAdminResponseDto,
  PaginatedProductsSellerResponseDto,
} from './dto/paginated-products-response.dto';
import { ProductMapper } from './mappers/product.mapper';
import { StockAdjustmentsService } from '../stock/stock-adjustments.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PricesService } from '../prices/prices.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnitConversion)
    private readonly conversionRepository: Repository<ProductUnitConversion>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly stockAdjustmentsService: StockAdjustmentsService,
    private readonly dataSource: DataSource,
    private readonly pricesService: PricesService,
  ) {}

  async findAll(
    query: QueryProductsDto,
    userRole?: UserRole,
  ): Promise<
    PaginatedProductsAdminResponseDto | PaginatedProductsSellerResponseDto
  > {
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset =
      query.offset !== undefined && query.offset >= 0
        ? query.offset
        : query.page && query.page > 0
          ? (query.page - 1) * limit
          : 0;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.baseUnit', 'baseUnit')
      .leftJoinAndSelect('product.conversions', 'conversions')
      .leftJoinAndSelect('conversions.presentationUnit', 'presentationUnit');

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('product.categoryId = :category', {
        category: query.category,
      });
    }

    if (query.search && query.search.trim().length > 0) {
      const escaped = ProductsService.escapeLikePattern(query.search.trim());
      qb.andWhere(
        '(UPPER(product.internalCode) LIKE UPPER(:searchPattern) OR product.name ILIKE :searchPattern)',
        { searchPattern: `%${escaped}%` },
      );
    }

    qb.orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    if (userRole === UserRole.ADMINISTRADOR) {
      await Promise.all(
        items.map((product) => this.pricesService.hydrateLegacyMarkup(product)),
      );
      return {
        items: items.map((p) => ProductMapper.toAdminResponse(p)),
        total,
        offset,
        limit,
      };
    }

    return {
      items: items.map((p) => ProductMapper.toSellerResponse(p)),
      total,
      offset,
      limit,
    };
  }

  public static escapeLikePattern(term: string): string {
    return term.replace(/[%_\\]/g, '\\$&');
  }

  async searchTypeahead(
    dto: SearchProductsDto,
  ): Promise<ProductSummaryResponseDto[]> {
    const trimmed = dto.q ? dto.q.trim() : '';
    if (trimmed.length < 2) {
      return [];
    }

    const limit = dto.limit && dto.limit > 0 ? Math.min(dto.limit, 50) : 10;
    const escaped = ProductsService.escapeLikePattern(trimmed);
    const upperTerm = trimmed.toUpperCase();
    const upperEscapedTerm = escaped.toUpperCase();

    const products = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.baseUnit', 'baseUnit')
      .leftJoin('product.stock', 'stock')
      .select([
        'product.id',
        'product.internalCode',
        'product.name',
        'product.activePriceNet',
        'baseUnit.id',
        'baseUnit.name',
        'baseUnit.symbol',
        'stock.id',
        'stock.currentBaseStock',
      ])
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere(
        '(UPPER(product.internalCode) LIKE UPPER(:searchLike) OR product.name ILIKE :searchLike)',
        { searchLike: `%${escaped}%` },
      )
      .addSelect(
        `CASE
          WHEN UPPER(TRIM(product.internalCode)) = :exact THEN 1
          WHEN UPPER(TRIM(product.internalCode)) LIKE :prefixUpper THEN 2
          ELSE 3
        END`,
        'search_rank',
      )
      .orderBy('search_rank', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .setParameters({
        exact: upperTerm,
        prefixUpper: `${upperEscapedTerm}%`,
      })
      .take(limit)
      .getMany();

    return products.map((p) => ProductMapper.toSummaryResponse(p));
  }

  async findById(
    id: string,
    userRole?: UserRole,
  ): Promise<ProductAdminResponseDto | ProductSellerResponseDto> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.baseUnit', 'baseUnit')
      .leftJoinAndSelect('product.conversions', 'conversions')
      .leftJoinAndSelect('conversions.presentationUnit', 'presentationUnit')
      .where('product.id = :id', { id })
      .getOne();

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (userRole === UserRole.ADMINISTRADOR)
      await this.pricesService.hydrateLegacyMarkup(product);
    return ProductMapper.toResponse(product, userRole);
  }

  async create(
    dto: CreateProductDto,
    actor: AuthenticatedUser,
  ): Promise<ProductAdminResponseDto> {
    // 1. Verify Category exists
    const category = await this.categoryRepository.findOneBy({
      id: dto.categoryId,
    });
    if (!category) {
      throw new NotFoundException('La categoría especificada no existe.');
    }

    // 2. Verify Base Unit exists
    const baseUnit = await this.unitRepository.findOneBy({
      id: dto.baseUnitId,
    });
    if (!baseUnit) {
      throw new NotFoundException('La unidad base especificada no existe.');
    }

    // 3. Validate Nested Conversions if present
    if (dto.conversions && dto.conversions.length > 0) {
      const seenUnits = new Set<string>();

      for (const conv of dto.conversions) {
        if (conv.presentationUnitId === dto.baseUnitId) {
          throw new BadRequestException(
            'La unidad de presentación no puede ser igual a la unidad base del producto.',
          );
        }
        if (seenUnits.has(conv.presentationUnitId)) {
          throw new BadRequestException(
            'No se pueden incluir unidades de presentación repetidas en las conversiones del producto.',
          );
        }
        seenUnits.add(conv.presentationUnitId);

        const presentationUnit = await this.unitRepository.findOneBy({
          id: conv.presentationUnitId,
        });
        if (!presentationUnit) {
          throw new NotFoundException(
            `La unidad de presentación con ID "${conv.presentationUnitId}" no existe.`,
          );
        }
      }
    }

    // 4. Execute Transaction. PostgreSQL assigns internalCode from its sequence.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdProduct: Product;
    try {
      const productEntity = queryRunner.manager.create(Product, {
        name: dto.name.trim(),
        description: dto.description || null,
        categoryId: dto.categoryId,
        baseUnitId: dto.baseUnitId,
        minStock: dto.minStock !== undefined ? dto.minStock : 0,
        costNet: dto.costNet,
        suggestedPriceNet: 0,
        activePriceNet: dto.activePriceNet,
        status: ProductStatus.ACTIVE,
      });

      createdProduct = await queryRunner.manager.save(Product, productEntity);

      if (dto.markupPercentage !== undefined) {
        await this.pricesService.applyLegacyProductMarkup(
          queryRunner.manager,
          createdProduct,
          dto.markupPercentage,
          actor.id,
        );
      }
      const effectiveMarkup = await this.pricesService.hydrateLegacyMarkup(
        createdProduct,
        queryRunner.manager,
      );
      createdProduct.suggestedPriceNet =
        this.pricesService.calculateSuggestedPrice(
          dto.costNet,
          effectiveMarkup.markupPercentage,
        );
      await queryRunner.manager.save(Product, createdProduct);

      const stockEntity = queryRunner.manager.create(Stock, {
        productId: createdProduct.id,
        currentBaseStock: '0.00',
      });
      await queryRunner.manager.save(Stock, stockEntity);

      if (dto.initialStock !== undefined && dto.initialStock > 0) {
        await this.stockAdjustmentsService.createAdjustment(
          {
            productId: createdProduct.id,
            movementType: StockMovementType.AJUSTE_ENTRADA,
            quantityBase: dto.initialStock,
            reason: 'Stock inicial al crear el producto',
            documentReference: null,
          },
          actor,
          queryRunner.manager,
        );
      }

      if (dto.conversions && dto.conversions.length > 0) {
        const conversionEntities = dto.conversions.map((c) =>
          queryRunner.manager.create(ProductUnitConversion, {
            productId: createdProduct.id,
            presentationUnitId: c.presentationUnitId,
            conversionFactor: c.conversionFactor,
          }),
        );
        await queryRunner.manager.save(
          ProductUnitConversion,
          conversionEntities,
        );
      }

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      const databaseErrorCode = error?.driverError?.code ?? error?.code;
      if (databaseErrorCode === '2200H') {
        throw new ConflictException(
          'Se alcanzó el límite de códigos automáticos disponibles (P9999).',
        );
      }
      if (databaseErrorCode === '23505') {
        throw new ConflictException(
          'No se pudo asignar un código interno único al producto.',
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Fetch full product with relations
    const fullProduct = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.baseUnit', 'baseUnit')
      .leftJoinAndSelect('product.conversions', 'conversions')
      .leftJoinAndSelect('conversions.presentationUnit', 'presentationUnit')
      .where('product.id = :id', { id: createdProduct.id })
      .getOne();

    await this.pricesService.hydrateLegacyMarkup(fullProduct!);
    return ProductMapper.toAdminResponse(fullProduct!);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actor?: AuthenticatedUser,
  ): Promise<ProductAdminResponseDto> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);

      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [id]);

      // Serialize base-unit changes with conversion creation for this product.
      const lockedProduct = await productRepository
        .createQueryBuilder('product')
        .where('product.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!lockedProduct) {
        throw new NotFoundException('Producto no encontrado.');
      }

      const product = await productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.baseUnit', 'baseUnit')
        .leftJoinAndSelect('product.conversions', 'conversions')
        .leftJoinAndSelect('conversions.presentationUnit', 'presentationUnit')
        .where('product.id = :id', { id })
        .getOne();

      if (!product) {
        throw new NotFoundException('Producto no encontrado.');
      }

      let hasChanges = false;

      // Check Name
      if (dto.name !== undefined) {
        const trimmedName = dto.name.trim();
        if (trimmedName !== product.name) {
          product.name = trimmedName;
          hasChanges = true;
        }
      }

      // Check Description (supports null clearing)
      if (dto.description !== undefined) {
        const newDesc =
          dto.description && dto.description.trim() !== ''
            ? dto.description.trim()
            : null;
        if (newDesc !== (product.description || null)) {
          product.description = newDesc;
          hasChanges = true;
        }
      }

      // Check Category
      if (
        dto.categoryId !== undefined &&
        dto.categoryId !== product.categoryId
      ) {
        const category = await manager.getRepository(Category).findOneBy({
          id: dto.categoryId,
        });
        if (!category) {
          throw new NotFoundException('La categoría especificada no existe.');
        }
        product.categoryId = dto.categoryId;
        product.category = category;
        hasChanges = true;
      }

      // Check Base Unit
      if (
        dto.baseUnitId !== undefined &&
        dto.baseUnitId !== product.baseUnitId
      ) {
        if (product.conversions && product.conversions.length > 0) {
          throw new BadRequestException(
            'No se puede modificar la unidad base de un producto que posee conversiones de unidades registradas. Elimine primero las conversiones.',
          );
        }
        const unit = await manager.getRepository(Unit).findOneBy({
          id: dto.baseUnitId,
        });
        if (!unit) {
          throw new NotFoundException('La unidad base especificada no existe.');
        }
        product.baseUnitId = dto.baseUnitId;
        product.baseUnit = unit;
        hasChanges = true;
      }

      // Check Min Stock
      if (dto.minStock !== undefined) {
        const currentMinStock = new Decimal(product.minStock).toNumber();
        if (dto.minStock !== currentMinStock) {
          product.minStock = dto.minStock;
          hasChanges = true;
        }
      }

      // Check Status
      if (dto.status !== undefined && dto.status !== product.status) {
        product.status = dto.status;
        hasChanges = true;
      }

      // Check cost, category and transitional product markup -> recalculate suggestion.
      let costChanged = false;
      let newCost = new Decimal(product.costNet).toNumber();
      if (dto.costNet !== undefined) {
        if (dto.costNet !== newCost) {
          newCost = dto.costNet;
          product.costNet = dto.costNet;
          costChanged = true;
          hasChanges = true;
        }
      }

      let markupChanged = false;
      if (dto.markupPercentage !== undefined) {
        markupChanged = await this.pricesService.applyLegacyProductMarkup(
          manager,
          product,
          dto.markupPercentage,
          actor?.id,
        );
        hasChanges ||= markupChanged;
      }

      if (costChanged || markupChanged || dto.categoryId !== undefined) {
        const hydrated = await this.pricesService.hydrateLegacyMarkup(
          product,
          manager,
        );
        product.suggestedPriceNet = this.pricesService.calculateSuggestedPrice(
          newCost,
          hydrated.markupPercentage,
        );
      }

      // Check Active Price
      if (dto.activePriceNet !== undefined) {
        const currentActivePrice = new Decimal(
          product.activePriceNet,
        ).toNumber();
        if (dto.activePriceNet !== currentActivePrice) {
          product.activePriceNet = dto.activePriceNet;
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        throw new BadRequestException(
          'No se detectaron modificaciones en los datos del producto.',
        );
      }

      await productRepository.save(product);

      return productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.baseUnit', 'baseUnit')
        .leftJoinAndSelect('product.conversions', 'conversions')
        .leftJoinAndSelect('conversions.presentationUnit', 'presentationUnit')
        .where('product.id = :id', { id: product.id })
        .getOneOrFail();
    });

    await this.pricesService.hydrateLegacyMarkup(updated);
    return ProductMapper.toAdminResponse(updated);
  }

  async deactivate(id: string): Promise<void> {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (product.status !== ProductStatus.INACTIVE) {
      product.status = ProductStatus.INACTIVE;
      await this.productRepository.save(product);
    }
  }

  async findConversions(
    productId: string,
  ): Promise<ProductUnitConversionResponseDto[]> {
    const productExists = await this.productRepository.exist({
      where: { id: productId },
    });
    if (!productExists) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const conversions = await this.conversionRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.presentationUnit', 'presentationUnit')
      .where('c.productId = :productId', { productId })
      .orderBy('c.createdAt', 'ASC')
      .getMany();

    return conversions.map((c) => ProductMapper.toConversionResponse(c));
  }

  async addConversion(
    productId: string,
    dto: CreateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const conversionRepository = manager.getRepository(ProductUnitConversion);

      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        productId,
      ]);

      const product = await productRepository
        .createQueryBuilder('product')
        .where('product.id = :productId', { productId })
        .setLock('pessimistic_write')
        .getOne();
      if (!product) {
        throw new NotFoundException('Producto no encontrado.');
      }

      if (dto.presentationUnitId === product.baseUnitId) {
        throw new BadRequestException(
          'La unidad de presentación no puede ser igual a la unidad base del producto.',
        );
      }

      const unit = await manager.getRepository(Unit).findOneBy({
        id: dto.presentationUnitId,
      });
      if (!unit) {
        throw new NotFoundException(
          'La unidad de presentación especificada no existe.',
        );
      }

      const existingConversion = await conversionRepository.findOneBy({
        productId,
        presentationUnitId: dto.presentationUnitId,
      });
      if (existingConversion) {
        throw new ConflictException(
          'Ya existe una regla de conversión para esta unidad de presentación en el producto.',
        );
      }

      try {
        const conversion = conversionRepository.create({
          productId,
          presentationUnitId: dto.presentationUnitId,
          conversionFactor: dto.conversionFactor,
        });

        const saved = await conversionRepository.save(conversion);
        saved.presentationUnit = unit;
        return ProductMapper.toConversionResponse(saved);
      } catch (error: any) {
        if (error?.driverError?.code === '23505' || error?.code === '23505') {
          throw new ConflictException(
            'Ya existe una regla de conversión para esta unidad de presentación en el producto.',
          );
        }
        throw error;
      }
    });
  }

  async updateConversion(
    productId: string,
    conversionId: string,
    dto: UpdateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponseDto> {
    const conversion = await this.conversionRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.presentationUnit', 'presentationUnit')
      .where('c.id = :conversionId', { conversionId })
      .andWhere('c.productId = :productId', { productId })
      .getOne();

    if (!conversion) {
      throw new NotFoundException(
        'Regla de conversión no encontrada en el producto especificado.',
      );
    }

    const currentFactor = new Decimal(conversion.conversionFactor).toNumber();
    if (dto.conversionFactor === currentFactor) {
      throw new BadRequestException(
        'No se detectaron modificaciones en el factor de conversión.',
      );
    }

    conversion.conversionFactor = dto.conversionFactor;
    const saved = await this.conversionRepository.save(conversion);
    return ProductMapper.toConversionResponse(saved);
  }

  async deleteConversion(
    productId: string,
    conversionId: string,
  ): Promise<void> {
    const conversion = await this.conversionRepository.findOneBy({
      id: conversionId,
      productId,
    });

    if (!conversion) {
      throw new NotFoundException(
        'Regla de conversión no encontrada en el producto especificado.',
      );
    }

    await this.conversionRepository.remove(conversion);
  }
}

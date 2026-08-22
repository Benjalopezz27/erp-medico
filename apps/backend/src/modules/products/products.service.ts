import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserRole, ProductStatus } from '@erp/shared-types';
import Decimal from 'decimal.js';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { UpdateProductUnitConversionDto } from './dto/update-product-unit-conversion.dto';
import { ProductAdminResponseDto } from './dto/product-admin-response.dto';
import { ProductSellerResponseDto } from './dto/product-seller-response.dto';
import { ProductUnitConversionResponseDto } from './dto/product-unit-conversion-response.dto';
import {
  PaginatedProductsAdminResponseDto,
  PaginatedProductsSellerResponseDto,
} from './dto/paginated-products-response.dto';
import { ProductMapper } from './mappers/product.mapper';
import { UnitConversionEngine } from './services/unit-conversion-engine.service';

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
    private readonly unitConversionEngine: UnitConversionEngine,
    private readonly dataSource: DataSource,
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

    qb.orderBy('product.name', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    if (userRole === UserRole.ADMINISTRADOR) {
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

    return ProductMapper.toResponse(product, userRole);
  }

  async create(dto: CreateProductDto): Promise<ProductAdminResponseDto> {
    const normalizedCode = dto.internalCode.trim().toUpperCase();

    // 1. Verify internalCode uniqueness
    const existingCode = await this.productRepository
      .createQueryBuilder('p')
      .where('UPPER(TRIM(p.internalCode)) = :code', { code: normalizedCode })
      .getOne();

    if (existingCode) {
      throw new ConflictException(
        'Ya existe un producto con el código interno especificado.',
      );
    }

    // 2. Verify Category exists
    const category = await this.categoryRepository.findOneBy({
      id: dto.categoryId,
    });
    if (!category) {
      throw new NotFoundException('La categoría especificada no existe.');
    }

    // 3. Verify Base Unit exists
    const baseUnit = await this.unitRepository.findOneBy({
      id: dto.baseUnitId,
    });
    if (!baseUnit) {
      throw new NotFoundException('La unidad base especificada no existe.');
    }

    // 4. Validate Nested Conversions if present
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

    // 5. Calculate suggestedPriceNet authoritatively
    const suggestedPriceNet = this.unitConversionEngine.calculateSuggestedPrice(
      dto.costNet,
      dto.markupPercentage,
    );

    // 6. Execute Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdProduct: Product;
    try {
      const productEntity = queryRunner.manager.create(Product, {
        internalCode: normalizedCode,
        name: dto.name.trim(),
        description: dto.description || null,
        categoryId: dto.categoryId,
        baseUnitId: dto.baseUnitId,
        minStock: dto.minStock !== undefined ? dto.minStock : 0,
        costNet: dto.costNet,
        markupPercentage:
          dto.markupPercentage !== undefined ? dto.markupPercentage : null,
        suggestedPriceNet,
        activePriceNet: dto.activePriceNet,
        status: ProductStatus.ACTIVE,
      });

      createdProduct = await queryRunner.manager.save(Product, productEntity);

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
      if (error?.driverError?.code === '23505' || error?.code === '23505') {
        throw new ConflictException(
          'Ya existe un producto con el código interno especificado.',
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

    return ProductMapper.toAdminResponse(fullProduct!);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
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

      // Check Cost & Markup -> Recalculate suggestedPriceNet
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
      let newMarkup =
        product.markupPercentage !== null &&
        product.markupPercentage !== undefined
          ? new Decimal(product.markupPercentage).toNumber()
          : null;

      if (dto.markupPercentage !== undefined) {
        const incomingMarkup =
          dto.markupPercentage !== null ? dto.markupPercentage : null;
        if (incomingMarkup !== newMarkup) {
          newMarkup = incomingMarkup;
          product.markupPercentage = incomingMarkup;
          markupChanged = true;
          hasChanges = true;
        }
      }

      if (costChanged || markupChanged) {
        product.suggestedPriceNet =
          this.unitConversionEngine.calculateSuggestedPrice(newCost, newMarkup);
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

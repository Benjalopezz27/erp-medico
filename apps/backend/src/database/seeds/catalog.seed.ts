import { DataSource, Raw, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { ProductStatus } from '@erp/shared-types';
import { Category } from '../../modules/categories/entities/category.entity';
import { Unit } from '../../modules/units/entities/unit.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductUnitConversion } from '../../modules/products/entities/product-unit-conversion.entity';

interface SeedLogger {
  log: (message: string) => void;
  error: (message: string) => void;
}

interface SeedCount {
  created: number;
  skipped: number;
}

export interface CatalogSeedResult {
  categories: SeedCount;
  units: SeedCount;
  products: SeedCount;
  conversions: SeedCount;
}

export interface CatalogSeedOptions {
  logger?: SeedLogger;
}

const categories = [
  {
    key: 'medicines',
    name: 'Medicamentos',
    description: 'Medicamentos de venta libre y bajo receta.',
  },
  {
    key: 'medical-supplies',
    name: 'Insumos médicos',
    description: 'Material descartable y elementos para atención médica.',
  },
  {
    key: 'hygiene',
    name: 'Higiene y antisepsia',
    description: 'Productos para higiene, limpieza y desinfección.',
  },
  {
    key: 'clinical-nutrition',
    name: 'Nutrición clínica',
    description: 'Soluciones y productos de soporte nutricional.',
  },
] as const;

const units = [
  { key: 'tablet', name: 'Comprimido', symbol: 'cmp' },
  { key: 'capsule', name: 'Cápsula', symbol: 'cap' },
  { key: 'unit', name: 'Unidad', symbol: 'un' },
  { key: 'milliliter', name: 'Mililitro', symbol: 'ml' },
  { key: 'blister', name: 'Blíster', symbol: 'bl' },
  { key: 'box', name: 'Caja', symbol: 'cj' },
  { key: 'bottle', name: 'Frasco', symbol: 'fr' },
  { key: 'pack', name: 'Paquete', symbol: 'paq' },
] as const;

const products = [
  {
    name: 'Ibuprofeno 400 mg',
    description: 'Comprimidos de ibuprofeno 400 mg.',
    categoryKey: 'medicines',
    baseUnitKey: 'tablet',
    minStock: 100,
    costNet: 120,
    markupPercentage: 35,
    activePriceNet: 165,
    status: ProductStatus.ACTIVE,
    conversions: [
      { unitKey: 'blister', factor: 10 },
      { unitKey: 'box', factor: 20 },
    ],
  },
  {
    name: 'Amoxicilina 500 mg',
    description: 'Cápsulas de amoxicilina 500 mg.',
    categoryKey: 'medicines',
    baseUnitKey: 'capsule',
    minStock: 80,
    costNet: 280,
    markupPercentage: 40,
    activePriceNet: 400,
    status: ProductStatus.ACTIVE,
    conversions: [
      { unitKey: 'blister', factor: 8 },
      { unitKey: 'box', factor: 16 },
    ],
  },
  {
    name: 'Gasa estéril 10 x 10 cm',
    description: 'Gasa estéril en sobres individuales.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 200,
    costNet: 45,
    markupPercentage: 30,
    activePriceNet: 60,
    status: ProductStatus.ACTIVE,
    conversions: [
      { unitKey: 'pack', factor: 10 },
      { unitKey: 'box', factor: 100 },
    ],
  },
  {
    name: 'Alcohol etílico 70%',
    description: 'Alcohol al 70% en frasco de 500 ml.',
    categoryKey: 'hygiene',
    baseUnitKey: 'milliliter',
    minStock: 5000,
    costNet: 2.4,
    markupPercentage: 25,
    activePriceNet: 3.2,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'bottle', factor: 500 }],
  },
  {
    name: 'Solución fisiológica 0,9%',
    description: 'Solución fisiológica en frasco de 1000 ml.',
    categoryKey: 'clinical-nutrition',
    baseUnitKey: 'milliliter',
    minStock: 10000,
    costNet: 1.1,
    markupPercentage: 20,
    activePriceNet: 1.35,
    status: ProductStatus.INACTIVE,
    conversions: [
      { unitKey: 'bottle', factor: 1000 },
      { unitKey: 'box', factor: 12000 },
    ],
  },
] as const;

function normalized(value: string, parameterName: string) {
  return Raw(
    (alias) => `LOWER(TRIM(${alias})) = LOWER(TRIM(:${parameterName}))`,
    { [parameterName]: value },
  );
}

function calculateSuggestedPrice(
  costNet: number,
  markupPercentage: number,
): number {
  return new Decimal(costNet)
    .times(new Decimal(1).plus(new Decimal(markupPercentage).dividedBy(100)))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

async function findOrCreateCategory(
  repository: Repository<Category>,
  definition: (typeof categories)[number],
): Promise<{ entity: Category; created: boolean }> {
  const existing = await repository.findOne({
    where: { name: normalized(definition.name, 'categoryName') },
  });
  if (existing) return { entity: existing, created: false };

  const entity = repository.create({
    name: definition.name,
    description: definition.description,
  });
  return { entity: await repository.save(entity), created: true };
}

async function findOrCreateUnit(
  repository: Repository<Unit>,
  definition: (typeof units)[number],
): Promise<{ entity: Unit; created: boolean }> {
  const existing = await repository.findOne({
    where: [
      { name: normalized(definition.name, 'unitName') },
      { symbol: normalized(definition.symbol, 'unitSymbol') },
    ],
  });
  if (existing) return { entity: existing, created: false };

  const entity = repository.create({
    name: definition.name,
    symbol: definition.symbol,
  });
  return { entity: await repository.save(entity), created: true };
}

/** Seeds an idempotent demonstration catalog inside a single transaction. */
export async function runCatalogSeed(
  dataSource: DataSource,
  options?: CatalogSeedOptions,
): Promise<CatalogSeedResult> {
  const logger = options?.logger ?? {
    log: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
  };
  const result: CatalogSeedResult = {
    categories: { created: 0, skipped: 0 },
    units: { created: 0, skipped: 0 },
    products: { created: 0, skipped: 0 },
    conversions: { created: 0, skipped: 0 },
  };

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const categoryRepository = queryRunner.manager.getRepository(Category);
    const unitRepository = queryRunner.manager.getRepository(Unit);
    const productRepository = queryRunner.manager.getRepository(Product);
    const conversionRepository = queryRunner.manager.getRepository(
      ProductUnitConversion,
    );
    const categoryByKey = new Map<string, Category>();
    const unitByKey = new Map<string, Unit>();

    for (const definition of categories) {
      const seeded = await findOrCreateCategory(categoryRepository, definition);
      categoryByKey.set(definition.key, seeded.entity);
      result.categories[seeded.created ? 'created' : 'skipped']++;
    }

    for (const definition of units) {
      const seeded = await findOrCreateUnit(unitRepository, definition);
      unitByKey.set(definition.key, seeded.entity);
      result.units[seeded.created ? 'created' : 'skipped']++;
    }

    for (const definition of products) {
      let product = await productRepository.findOne({
        where: {
          name: normalized(definition.name, 'productName'),
        },
      });

      if (product) {
        result.products.skipped++;
      } else {
        product = productRepository.create({
          name: definition.name,
          description: definition.description,
          categoryId: categoryByKey.get(definition.categoryKey)!.id,
          baseUnitId: unitByKey.get(definition.baseUnitKey)!.id,
          minStock: definition.minStock,
          costNet: definition.costNet,
          markupPercentage: definition.markupPercentage,
          suggestedPriceNet: calculateSuggestedPrice(
            definition.costNet,
            definition.markupPercentage,
          ),
          activePriceNet: definition.activePriceNet,
          status: definition.status,
        });
        product = await productRepository.save(product);
        result.products.created++;
      }

      for (const conversionDefinition of definition.conversions) {
        const presentationUnitId = unitByKey.get(
          conversionDefinition.unitKey,
        )!.id;
        const existingConversion = await conversionRepository.findOne({
          where: { productId: product.id, presentationUnitId },
        });

        if (existingConversion) {
          result.conversions.skipped++;
          continue;
        }

        const conversion = conversionRepository.create({
          productId: product.id,
          presentationUnitId,
          conversionFactor: conversionDefinition.factor,
        });
        await conversionRepository.save(conversion);
        result.conversions.created++;
      }
    }

    await queryRunner.commitTransaction();
    logger.log(
      `[SEED] Demo catalog ready: ${result.categories.created} categories, ${result.units.created} units, ${result.products.created} products and ${result.conversions.created} conversions created.`,
    );
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('[SEED] Catalog seed failed and was rolled back.');
    throw error;
  } finally {
    await queryRunner.release();
  }
}

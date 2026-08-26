import { DataSource, Raw, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { ProductStatus, TaxCondition } from '@erp/shared-types';
import { Category } from '../../modules/categories/entities/category.entity';
import { Unit } from '../../modules/units/entities/unit.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductUnitConversion } from '../../modules/products/entities/product-unit-conversion.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../modules/suppliers/supplier-products/entities/supplier-product.entity';

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
  suppliers: SeedCount;
  supplierProducts: SeedCount;
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
  {
    key: 'diagnostic-equipment',
    name: 'Equipamiento y diagnóstico',
    description: 'Dispositivos e instrumental médico de diagnóstico.',
  },
] as const;

const units = [
  { key: 'tablet', name: 'Comprimido', symbol: 'cmp' },
  { key: 'capsule', name: 'Cápsula', symbol: 'cap' },
  { key: 'unit', name: 'Unidad', symbol: 'un' },
  { key: 'milliliter', name: 'Mililitro', symbol: 'ml' },
  { key: 'blister', name: 'Blíster', symbol: 'bl' },
  { key: 'box', name: 'Caja', symbol: 'cj' },
  { key: 'bottle', name: 'Botella', symbol: 'bot' },
  { key: 'flask', name: 'Frasco', symbol: 'fr' },
  { key: 'pack', name: 'Paquete', symbol: 'paq' },
  { key: 'roll', name: 'Rollo', symbol: 'rll' },
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
    name: 'Venda elástica 10 cm x 4 m',
    description: 'Venda elástica de compresión 10 cm x 4 m.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 50,
    costNet: 2300,
    markupPercentage: 35,
    activePriceNet: 3105,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'pack', factor: 12 }],
  },
  {
    name: 'Curitas flexibles',
    description: 'Apósitos adhesivos protectores flexibles.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 100,
    costNet: 95,
    markupPercentage: 40,
    activePriceNet: 133,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 20 }],
  },
  {
    name: 'Jeringa descartable 5 ml',
    description: 'Jeringa descartable de 5 ml sin aguja, cono luer.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 500,
    costNet: 180,
    markupPercentage: 35,
    activePriceNet: 243,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 100 }],
  },
  {
    name: 'Jeringa 10 ml con aguja',
    description: 'Jeringa descartable de 10 ml con aguja 21G x 1 1/2.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 300,
    costNet: 330,
    markupPercentage: 35,
    activePriceNet: 445.5,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 80 }],
  },
  {
    name: 'Algodón hidrófilo 500 g',
    description: 'Algodón hidrófilo puro en paquete de 500 g.',
    categoryKey: 'hygiene',
    baseUnitKey: 'pack',
    minStock: 40,
    costNet: 4200,
    markupPercentage: 30,
    activePriceNet: 5460,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 10 }],
  },
  {
    name: 'Alcohol etílico 70%',
    description: 'Alcohol etílico al 70% en botella de 1 litro.',
    categoryKey: 'hygiene',
    baseUnitKey: 'bottle',
    minStock: 50,
    costNet: 2800,
    markupPercentage: 25,
    activePriceNet: 3500,
    status: ProductStatus.ACTIVE,
    conversions: [],
  },
  {
    name: 'Guantes de nitrilo talle M',
    description: 'Guantes descartables de nitrilo sin polvo talle M.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 500,
    costNet: 95,
    markupPercentage: 35,
    activePriceNet: 128.25,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 100 }],
  },
  {
    name: 'Barbijo tricapa descartable',
    description: 'Barbijos quirúrgicos tricapa con elástico y clip nasal.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'unit',
    minStock: 1000,
    costNet: 104,
    markupPercentage: 35,
    activePriceNet: 140.4,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 50 }],
  },
  {
    name: 'Cinta microporosa 25 mm x 9 m',
    description: 'Cinta hipoalergénica microporosa 25 mm x 9 m.',
    categoryKey: 'medical-supplies',
    baseUnitKey: 'roll',
    minStock: 60,
    costNet: 1100,
    markupPercentage: 35,
    activePriceNet: 1485,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 24 }],
  },
  {
    name: 'Termómetro digital',
    description: 'Termómetro digital clínico con alarma sonora y estuche.',
    categoryKey: 'diagnostic-equipment',
    baseUnitKey: 'unit',
    minStock: 20,
    costNet: 7000,
    markupPercentage: 40,
    activePriceNet: 9800,
    status: ProductStatus.ACTIVE,
    conversions: [],
  },
  {
    name: 'Solución fisiológica 500 ml',
    description:
      'Solución fisiológica de cloruro de sodio al 0,9% frasco 500 ml.',
    categoryKey: 'clinical-nutrition',
    baseUnitKey: 'bottle',
    minStock: 100,
    costNet: 2100,
    markupPercentage: 20,
    activePriceNet: 2520,
    status: ProductStatus.ACTIVE,
    conversions: [{ unitKey: 'box', factor: 20 }],
  },
] as const;

const demoSuppliers = [
  {
    key: 'drogueria-medica',
    businessName: 'Droguería Médica S.A.',
    cuit: '30712345678',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    email: 'ventas@drogueriamedica.com.ar',
    phone: '+54 11 4567-8900',
    address: 'Av. Corrientes 1234, CABA',
    isActive: true,
  },
] as const;

const demoSupplierProducts = [
  {
    supplierKey: 'drogueria-medica',
    productName: 'Gasa estéril 10 x 10 cm',
    supplierExternalCode: 'MED-001',
    supplierDescription: 'Gasa estéril 10 x 10 cm, paquete x 10',
    purchaseUnitKey: 'pack',
    conversionFactorToBase: 10,
    usualCostNet: 1200,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Venda elástica 10 cm x 4 m',
    supplierExternalCode: 'SKU-00123',
    supplierDescription: 'Venda elástica 10 cm x 4 m',
    purchaseUnitKey: 'unit',
    conversionFactorToBase: 1,
    usualCostNet: 2300,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Curitas flexibles',
    supplierExternalCode: 'CUR-20-FLEX',
    supplierDescription: 'Curitas flexibles, caja x 20',
    purchaseUnitKey: 'box',
    conversionFactorToBase: 20,
    usualCostNet: 1950,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Jeringa descartable 5 ml',
    supplierExternalCode: 'JER-05',
    supplierDescription: 'Jeringa descartable 5 ml',
    purchaseUnitKey: 'unit',
    conversionFactorToBase: 1,
    usualCostNet: 180,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Jeringa 10 ml con aguja',
    supplierExternalCode: 'JER-10-AG',
    supplierDescription: 'Jeringa 10 ml con aguja',
    purchaseUnitKey: 'unit',
    conversionFactorToBase: 1,
    usualCostNet: 330,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Algodón hidrófilo 500 g',
    supplierExternalCode: 'ALG-500',
    supplierDescription: 'Algodón hidrófilo 500 g',
    purchaseUnitKey: 'pack',
    conversionFactorToBase: 1,
    usualCostNet: 4200,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Alcohol etílico 70%',
    supplierExternalCode: 'ALC-70-1L',
    supplierDescription: 'Alcohol etílico 70%, botella 1 litro',
    purchaseUnitKey: 'bottle',
    conversionFactorToBase: 1,
    usualCostNet: 2800,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Guantes de nitrilo talle M',
    supplierExternalCode: 'GU-NIT-M',
    supplierDescription: 'Guantes de nitrilo talle M, caja x 100',
    purchaseUnitKey: 'box',
    conversionFactorToBase: 100,
    usualCostNet: 9500,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Barbijo tricapa descartable',
    supplierExternalCode: 'BARB-TRI',
    supplierDescription: 'Barbijo tricapa descartable, caja x 50',
    purchaseUnitKey: 'box',
    conversionFactorToBase: 50,
    usualCostNet: 5200,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Cinta microporosa 25 mm x 9 m',
    supplierExternalCode: 'CIN-MIC-25',
    supplierDescription: 'Cinta microporosa 25 mm x 9 m',
    purchaseUnitKey: 'roll',
    conversionFactorToBase: 1,
    usualCostNet: 1100,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Termómetro digital',
    supplierExternalCode: 'TERM-DIG',
    supplierDescription: 'Termómetro digital',
    purchaseUnitKey: 'unit',
    conversionFactorToBase: 1,
    usualCostNet: 7000,
    isPrimarySupplier: true,
  },
  {
    supplierKey: 'drogueria-medica',
    productName: 'Solución fisiológica 500 ml',
    supplierExternalCode: 'SOL-FIS-500',
    supplierDescription: 'Solución fisiológica 500 ml',
    purchaseUnitKey: 'bottle',
    conversionFactorToBase: 1,
    usualCostNet: 2100,
    isPrimarySupplier: true,
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

async function findOrCreateSupplier(
  repository: Repository<Supplier>,
  definition: (typeof demoSuppliers)[number],
): Promise<{ entity: Supplier; created: boolean }> {
  const existing = await repository.findOne({
    where: { cuit: definition.cuit },
  });
  if (existing) return { entity: existing, created: false };

  const entity = repository.create({
    businessName: definition.businessName,
    cuit: definition.cuit,
    taxCondition: definition.taxCondition,
    email: definition.email,
    phone: definition.phone,
    address: definition.address,
    isActive: definition.isActive,
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
    suppliers: { created: 0, skipped: 0 },
    supplierProducts: { created: 0, skipped: 0 },
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
    const supplierRepository = queryRunner.manager.getRepository(Supplier);
    const supplierProductRepository =
      queryRunner.manager.getRepository(SupplierProduct);

    const categoryByKey = new Map<string, Category>();
    const unitByKey = new Map<string, Unit>();
    const productByName = new Map<string, Product>();
    const supplierByKey = new Map<string, Supplier>();

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
      productByName.set(definition.name, product);

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

    for (const definition of demoSuppliers) {
      const seeded = await findOrCreateSupplier(supplierRepository, definition);
      supplierByKey.set(definition.key, seeded.entity);
      result.suppliers[seeded.created ? 'created' : 'skipped']++;
    }

    for (const definition of demoSupplierProducts) {
      const supplier = supplierByKey.get(definition.supplierKey)!;
      const product = productByName.get(definition.productName)!;
      const purchaseUnit = unitByKey.get(definition.purchaseUnitKey)!;

      const existingSupplierProduct = await supplierProductRepository.findOne({
        where: {
          supplierId: supplier.id,
          supplierExternalCode: definition.supplierExternalCode,
        },
      });

      if (existingSupplierProduct) {
        result.supplierProducts.skipped++;
        continue;
      }

      const spEntity = supplierProductRepository.create({
        supplierId: supplier.id,
        productId: product.id,
        supplierExternalCode: definition.supplierExternalCode,
        supplierDescription: definition.supplierDescription,
        purchaseUnitId: purchaseUnit.id,
        conversionFactorToBase: definition.conversionFactorToBase,
        usualCostNet: definition.usualCostNet,
        isPrimarySupplier: definition.isPrimarySupplier,
      });

      await supplierProductRepository.save(spEntity);
      result.supplierProducts.created++;
    }

    await queryRunner.commitTransaction();
    logger.log(
      `[SEED] Demo catalog ready: ${result.categories.created} categories, ${result.units.created} units, ${result.products.created} products, ${result.conversions.created} conversions, ${result.suppliers.created} suppliers and ${result.supplierProducts.created} supplier products created.`,
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

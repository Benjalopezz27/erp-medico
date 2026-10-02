import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { ProductImportBatch } from './entities/product-import-batch.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockModule } from '../stock/stock.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UnitConversionEngine } from './services/unit-conversion-engine.service';
import { ProductBulkLoadService } from './bulk-load/product-bulk-load.service';
import { ProductBulkLoadValidator } from './bulk-load/product-bulk-load-validator';
import { PricesModule } from '../prices/prices.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    StockModule,
    PricesModule,
    AuditModule,
    TypeOrmModule.forFeature([
      Product,
      ProductUnitConversion,
      ProductImportBatch,
      Category,
      Unit,
      Stock,
    ]),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    UnitConversionEngine,
    ProductBulkLoadService,
    ProductBulkLoadValidator,
  ],
  exports: [
    ProductsService,
    UnitConversionEngine,
    ProductBulkLoadService,
    ProductBulkLoadValidator,
  ],
})
export class ProductsModule {}

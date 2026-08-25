import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockModule } from '../stock/stock.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UnitConversionEngine } from './services/unit-conversion-engine.service';

@Module({
  imports: [
    StockModule,
    TypeOrmModule.forFeature([
      Product,
      ProductUnitConversion,
      Category,
      Unit,
      Stock,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, UnitConversionEngine],
  exports: [ProductsService, UnitConversionEngine],
})
export class ProductsModule {}

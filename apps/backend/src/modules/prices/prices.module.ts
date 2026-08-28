import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { MarkupConfiguration } from './entities/markup-configuration.entity';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { MarkupEngineService } from './services/markup-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarkupConfiguration, Category, Product]),
    AuditModule,
  ],
  controllers: [PricesController],
  providers: [PricesService, MarkupEngineService],
  exports: [PricesService, MarkupEngineService],
})
export class PricesModule {}

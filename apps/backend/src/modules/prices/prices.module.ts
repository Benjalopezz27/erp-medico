import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { PriceReview } from '../purchases/entities/price-review.entity';
import { MarkupConfiguration } from './entities/markup-configuration.entity';
import { PriceReviewsController } from './price-reviews.controller';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { MarkupEngineService } from './services/markup-engine.service';
import { PriceReviewsService } from './services/price-reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarkupConfiguration,
      Category,
      Product,
      PriceReview,
    ]),
    AuditModule,
  ],
  controllers: [PricesController, PriceReviewsController],
  providers: [PricesService, MarkupEngineService, PriceReviewsService],
  exports: [PricesService, MarkupEngineService],
})
export class PricesModule {}

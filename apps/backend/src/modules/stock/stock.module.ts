import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockController } from './stock.controller';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockMovement, Product, User]),
    AuditModule,
  ],
  controllers: [StockController],
  providers: [StockService, StockAdjustmentsService],
  exports: [StockService, StockAdjustmentsService, TypeOrmModule],
})
export class StockModule {}

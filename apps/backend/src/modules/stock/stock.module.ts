import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockBulkLoadService } from './bulk-load/stock-bulk-load.service';
import { StockBulkLoadValidator } from './bulk-load/stock-bulk-load-validator';
import { StockController } from './stock.controller';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockImportBatch } from './entities/stock-import-batch.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stock,
      StockMovement,
      StockImportBatch,
      Product,
      User,
    ]),
    AuditModule,
  ],
  controllers: [StockController],
  providers: [
    StockService,
    StockAdjustmentsService,
    StockBulkLoadValidator,
    StockBulkLoadService,
  ],
  exports: [
    StockService,
    StockAdjustmentsService,
    StockBulkLoadValidator,
    StockBulkLoadService,
    TypeOrmModule,
  ],
})
export class StockModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuarantineStock } from './entities/quarantine-stock.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { StockMovement } from '../stock/entities/stock-movement.entity';
import { StockModule } from '../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { QuarantineController } from './quarantine.controller';
import { QuarantineService } from './quarantine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuarantineStock, Product, User, StockMovement]),
    StockModule,
    AuditModule,
  ],
  controllers: [QuarantineController],
  providers: [QuarantineService],
  exports: [QuarantineService],
})
export class QuarantineModule {}

import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { FiscalDocument } from './entities/fiscal-document.entity';
import { CustomersModule } from '../customers/customers.module';
import { StockModule } from '../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { ReceivablesModule } from '../receivables/receivables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, FiscalDocument]),
    CustomersModule,
    StockModule,
    AuditModule,
    ReceivablesModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

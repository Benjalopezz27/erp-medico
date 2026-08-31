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
import { QuarantineModule } from '../quarantine/quarantine.module';
import { SaleReturn } from './returns/entities/sale-return.entity';
import { SaleReturnItem } from './returns/entities/sale-return-item.entity';
import { SaleReturnsController } from './returns/sale-returns.controller';
import { SaleReturnsService } from './returns/services/sale-returns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      FiscalDocument,
      SaleReturn,
      SaleReturnItem,
    ]),
    CustomersModule,
    StockModule,
    AuditModule,
    ReceivablesModule,
    QuarantineModule,
  ],
  controllers: [SalesController, SaleReturnsController],
  providers: [SalesService, SaleReturnsService],
  exports: [SalesService, SaleReturnsService],
})
export class SalesModule {}

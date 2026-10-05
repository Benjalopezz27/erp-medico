import { TreasuryModule } from '../treasury/treasury.module';
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
import { QueueModule } from '../queue/queue.module';
import { ArcaModule } from '../arca/arca.module';
import { PendingFiscalController } from './pending-fiscal.controller';
import { PendingFiscalService } from './services/pending-fiscal.service';

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
    TreasuryModule,
    QuarantineModule,
    QueueModule,
    ArcaModule,
  ],
  // PendingFiscalController registered before SalesController: its literal
  // routes (sales/pending-fiscal, .../count, .../metrics) must be matched
  // before SalesController's `GET /sales/:id` parametric route.
  controllers: [
    PendingFiscalController,
    SalesController,
    SaleReturnsController,
  ],
  providers: [SalesService, SaleReturnsService, PendingFiscalService],
  exports: [SalesService, SaleReturnsService],
})
export class SalesModule {}

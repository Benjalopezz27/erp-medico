import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ImporterModule } from './modules/importer/importer.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { CostsModule } from './modules/costs/costs.module';
import { PricesModule } from './modules/prices/prices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ArcaModule } from './modules/arca/arca.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChecksModule } from './modules/checks/checks.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SystemConfigModule } from './modules/config/system-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    StockModule,
    SuppliersModule,
    ImporterModule,
    PurchasesModule,
    CostsModule,
    PricesModule,
    CustomersModule,
    SalesModule,
    ArcaModule,
    ReceivablesModule,
    PaymentsModule,
    ChecksModule,
    TreasuryModule,
    ReportsModule,
    SystemConfigModule,
  ],
})
export class AppModule {}

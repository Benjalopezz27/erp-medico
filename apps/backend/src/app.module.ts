import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';

import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UnitsModule } from './modules/units/units.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { QuarantineModule } from './modules/quarantine/quarantine.module';
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
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS) || 60000,
        limit: Number(process.env.THROTTLE_LIMIT_GLOBAL) || 120,
      },
    ]),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    UnitsModule,
    ProductsModule,
    StockModule,
    QuarantineModule,
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
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

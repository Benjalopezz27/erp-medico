import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { UnitsModule } from './modules/units/units.module';
import { StockModule } from './modules/stock/stock.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ImporterModule } from './modules/importer/importer.module';
import { PricesModule } from './modules/prices/prices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { ArcaModule } from './modules/arca/arca.module';
import { QueueProducerModule } from './modules/queue/queue-producer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    UsersModule,
    HealthModule,
    CategoriesModule,
    ProductsModule,
    UnitsModule,
    StockModule,
    SuppliersModule,
    PurchasesModule,
    ImporterModule,
    PricesModule,
    CustomersModule,
    SalesModule,
    ReceivablesModule,
    ArcaModule,
    QueueProducerModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

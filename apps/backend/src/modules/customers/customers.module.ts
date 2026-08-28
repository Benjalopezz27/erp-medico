import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Customer } from './entities/customer.entity';
import { CustomerSpecialPrice } from './special-prices/entities/customer-special-price.entity';
import { CustomerSpecialPricesController } from './special-prices/customer-special-prices.controller';
import { CustomerPricingService } from './special-prices/services/customer-pricing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerSpecialPrice]),
    AuditModule,
  ],
  controllers: [CustomersController, CustomerSpecialPricesController],
  providers: [CustomersService, CustomerPricingService],
  exports: [CustomersService, CustomerPricingService],
})
export class CustomersModule {}

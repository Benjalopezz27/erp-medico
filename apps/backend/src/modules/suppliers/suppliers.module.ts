import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierProduct } from './supplier-products/entities/supplier-product.entity';
import { SupplierProductsController } from './supplier-products/supplier-products.controller';
import { SupplierProductsService } from './supplier-products/supplier-products.service';
import { Product } from '../products/entities/product.entity';
import { Unit } from '../units/entities/unit.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierProduct, Product, Unit]),
    AuditModule,
  ],
  controllers: [SuppliersController, SupplierProductsController],
  providers: [SuppliersService, SupplierProductsService],
  exports: [SuppliersService, SupplierProductsService],
})
export class SuppliersModule {}

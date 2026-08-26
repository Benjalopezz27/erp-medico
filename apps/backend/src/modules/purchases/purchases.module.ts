import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../suppliers/supplier-products/entities/supplier-product.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      Supplier,
      SupplierProduct,
    ]),
    AuditModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchasesModule {}

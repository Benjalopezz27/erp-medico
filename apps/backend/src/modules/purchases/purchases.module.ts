import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { GoodsReceiptsController } from './controllers/goods-receipts.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { GoodsReceiptsService } from './services/goods-receipts.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../suppliers/supplier-products/entities/supplier-product.entity';
import { AuditModule } from '../audit/audit.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      Supplier,
      SupplierProduct,
    ]),
    AuditModule,
    StockModule,
  ],
  controllers: [PurchasesController, GoodsReceiptsController],
  providers: [PurchaseOrdersService, GoodsReceiptsService],
  exports: [PurchaseOrdersService, GoodsReceiptsService],
})
export class PurchasesModule {}

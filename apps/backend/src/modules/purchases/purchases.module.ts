import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { GoodsReceiptsController } from './controllers/goods-receipts.controller';
import { SupplierInvoicesController } from './controllers/supplier-invoices.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { GoodsReceiptsService } from './services/goods-receipts.service';
import { BackordersService } from './services/backorders.service';
import { SupplierInvoicesService } from './services/supplier-invoices.service';
import { SupplierInvoiceDecisionsService } from './services/supplier-invoice-decisions.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from './entities/supplier-invoice-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../suppliers/supplier-products/entities/supplier-product.entity';
import { AuditModule } from '../audit/audit.module';
import { StockModule } from '../stock/stock.module';
import { SystemConfigModule } from '../config/system-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      SupplierInvoice,
      SupplierInvoiceItem,
      Supplier,
      SupplierProduct,
    ]),
    AuditModule,
    StockModule,
    SystemConfigModule,
  ],
  controllers: [
    PurchasesController,
    GoodsReceiptsController,
    SupplierInvoicesController,
  ],
  providers: [
    PurchaseOrdersService,
    GoodsReceiptsService,
    BackordersService,
    SupplierInvoicesService,
    SupplierInvoiceDecisionsService,
  ],
  exports: [
    PurchaseOrdersService,
    GoodsReceiptsService,
    BackordersService,
    SupplierInvoicesService,
    SupplierInvoiceDecisionsService,
  ],
})
export class PurchasesModule {}

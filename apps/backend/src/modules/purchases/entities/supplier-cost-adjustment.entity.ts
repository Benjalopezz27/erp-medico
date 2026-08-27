import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { StockMovement } from '../../stock/entities/stock-movement.entity';
import { User } from '../../users/entities/user.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';
import { SupplierInvoice } from './supplier-invoice.entity';
import { SupplierInvoiceItem } from './supplier-invoice-item.entity';

@Entity('supplier_cost_adjustments')
export class SupplierCostAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_invoice_id', type: 'uuid' })
  supplierInvoiceId: string;

  @Column({ name: 'supplier_invoice_item_id', type: 'uuid', unique: true })
  supplierInvoiceItemId: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId: string;

  @Column({ name: 'goods_receipt_item_id', type: 'uuid' })
  goodsReceiptItemId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;

  @Column({ name: 'product_code_snapshot', type: 'varchar', length: 50 })
  productCodeSnapshot: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 200 })
  productNameSnapshot: string;

  @Column({
    name: 'provisional_cost_purchase_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  provisionalCostPurchaseUnitNet: string;

  @Column({
    name: 'real_cost_purchase_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  realCostPurchaseUnitNet: string;

  @Column({
    name: 'conversion_factor',
    type: 'numeric',
    precision: 10,
    scale: 4,
  })
  conversionFactor: string;

  @Column({
    name: 'provisional_cost_base_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  provisionalCostBaseUnitNet: string;

  @Column({
    name: 'real_cost_base_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  realCostBaseUnitNet: string;

  @Column({
    name: 'cost_difference_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  costDifferenceUnitNet: string;

  @Column({
    name: 'invoiced_qty_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  invoicedQtyBase: string;

  @Column({
    name: 'layer_start_qty_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  layerStartQtyBase: string;

  @Column({
    name: 'layer_end_qty_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  layerEndQtyBase: string;

  @Column({
    name: 'on_hand_allocated_qty',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  onHandAllocatedQty: string;

  @Column({
    name: 'consumed_allocated_qty',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  consumedAllocatedQty: string;

  @Column({
    name: 'stock_revaluation',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  stockRevaluation: string;

  @Column({ name: 'cogs_adjustment', type: 'numeric', precision: 24, scale: 4 })
  cogsAdjustment: string;

  @Column({
    name: 'previous_product_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  previousProductCostNet: string;

  @Column({
    name: 'new_product_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  newProductCostNet: string;

  @Column({ name: 'applied_by_user_id', type: 'uuid' })
  appliedByUserId: string;

  @CreateDateColumn({ name: 'applied_at', type: 'timestamptz' })
  appliedAt: Date;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.costAdjustments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_invoice_id' })
  supplierInvoice?: SupplierInvoice;

  @ManyToOne(() => SupplierInvoiceItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_invoice_item_id' })
  supplierInvoiceItem?: SupplierInvoiceItem;

  @ManyToOne(() => GoodsReceipt, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt?: GoodsReceipt;

  @ManyToOne(() => GoodsReceiptItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'goods_receipt_item_id' })
  goodsReceiptItem?: GoodsReceiptItem;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => StockMovement, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_movement_id' })
  stockMovement?: StockMovement;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'applied_by_user_id' })
  appliedByUser?: User;
}

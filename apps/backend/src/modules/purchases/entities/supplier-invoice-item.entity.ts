import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceQuantityStatus,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { SupplierInvoice } from './supplier-invoice.entity';

@Entity('supplier_invoice_items')
export class SupplierInvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_invoice_id', type: 'uuid' })
  supplierInvoiceId: string;

  @Column({ name: 'item_index', type: 'integer' })
  itemIndex: number;

  @Column({ name: 'goods_receipt_item_id', type: 'uuid' })
  goodsReceiptItemId: string;

  @Column({ name: 'purchase_order_item_id', type: 'uuid' })
  purchaseOrderItemId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'purchase_unit_id', type: 'uuid' })
  purchaseUnitId: string;

  @Column({ name: 'product_code_snapshot', type: 'varchar', length: 50 })
  productCodeSnapshot: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 200 })
  productNameSnapshot: string;

  @Column({ name: 'purchase_unit_name_snapshot', type: 'varchar', length: 50 })
  purchaseUnitNameSnapshot: string;

  @Column({
    name: 'purchase_unit_symbol_snapshot',
    type: 'varchar',
    length: 20,
  })
  purchaseUnitSymbolSnapshot: string;

  @Column({
    name: 'conversion_factor_snapshot',
    type: 'numeric',
    precision: 10,
    scale: 4,
  })
  conversionFactorSnapshot: string;

  @Column({
    name: 'received_qty_purchase_unit',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  receivedQtyPurchaseUnit: string;

  @Column({
    name: 'previously_allocated_qty_purchase_unit',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  previouslyAllocatedQtyPurchaseUnit: string;

  @Column({
    name: 'available_qty_before',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  availableQtyBefore: string;

  @Column({
    name: 'invoiced_qty_purchase_unit',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  invoicedQtyPurchaseUnit: string;

  @Column({
    name: 'allocated_received_qty_purchase_unit',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  allocatedReceivedQtyPurchaseUnit: string;

  @Column({
    name: 'allocated_received_qty_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  allocatedReceivedQtyBase: string;

  @Column({
    name: 'pending_qty_after',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  pendingQtyAfter: string;

  @Column({ name: 'quantity_excess', type: 'numeric', precision: 12, scale: 4 })
  quantityExcess: string;

  @Column({ name: 'quantity_status', type: 'varchar', length: 20 })
  quantityStatus: SupplierInvoiceQuantityStatus;

  @Column({
    name: 'provisional_cost_unit_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  provisionalCostUnitNet: string;

  @Column({ name: 'unit_price_net', type: 'numeric', precision: 12, scale: 4 })
  unitPriceNet: string;

  @Column({ name: 'discount_net', type: 'numeric', precision: 24, scale: 4 })
  discountNet: string;

  @Column({ name: 'discount_mode', type: 'varchar', length: 20 })
  discountMode: SupplierInvoiceAdjustmentMode;

  @Column({
    name: 'discount_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  discountPercentage: string | null;

  @Column({ name: 'bonus_net', type: 'numeric', precision: 24, scale: 4 })
  bonusNet: string;

  @Column({ name: 'bonus_mode', type: 'varchar', length: 20 })
  bonusMode: SupplierInvoiceAdjustmentMode;

  @Column({
    name: 'bonus_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  bonusPercentage: string | null;

  @Column({ name: 'surcharge_net', type: 'numeric', precision: 24, scale: 4 })
  surchargeNet: string;

  @Column({ name: 'surcharge_mode', type: 'varchar', length: 20 })
  surchargeMode: SupplierInvoiceAdjustmentMode;

  @Column({
    name: 'surcharge_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  surchargePercentage: string | null;

  @Column({
    name: 'real_cost_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  realCostUnitNet: string;

  @Column({ name: 'line_net_total', type: 'numeric', precision: 24, scale: 4 })
  lineNetTotal: string;

  @Column({
    name: 'cost_difference_unit_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  costDifferenceUnitNet: string;

  @Column({
    name: 'cost_variation_percentage',
    type: 'numeric',
    precision: 30,
    scale: 4,
    nullable: true,
  })
  costVariationPercentage: string | null;

  @Column({ name: 'cost_status', type: 'varchar', length: 40 })
  costStatus: SupplierInvoiceCostStatus;

  @Column({ name: 'quantity_observed', type: 'boolean' })
  quantityObserved: boolean;

  @Column({ name: 'cost_observed', type: 'boolean' })
  costObserved: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.items, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_invoice_id' })
  supplierInvoice?: SupplierInvoice;

  @ManyToOne(() => GoodsReceiptItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'goods_receipt_item_id' })
  goodsReceiptItem?: GoodsReceiptItem;

  @ManyToOne(() => PurchaseOrderItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem?: PurchaseOrderItem;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit?: Unit;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'item_index', type: 'integer' })
  itemIndex: number;

  @Column({ name: 'supplier_product_id', type: 'uuid' })
  supplierProductId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'purchase_unit_id', type: 'uuid' })
  purchaseUnitId: string;

  @Column({ name: 'supplier_sku_snapshot', type: 'varchar', length: 100 })
  supplierSkuSnapshot: string;

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
    name: 'ordered_qty',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  orderedQty: string;

  @Column({
    name: 'received_qty',
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: '0.0000',
  })
  receivedQty: string;

  @Column({
    name: 'expected_cost_unit_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  expectedCostUnitNet: string;

  @Column({
    name: 'subtotal_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  subtotalNet: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  @ManyToOne(() => SupplierProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct?: SupplierProduct;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit?: Unit;
}

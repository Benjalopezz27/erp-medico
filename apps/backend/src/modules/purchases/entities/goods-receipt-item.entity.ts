import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { StockMovement } from '../../stock/entities/stock-movement.entity';

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId: string;

  @Column({ name: 'purchase_order_item_id', type: 'uuid' })
  purchaseOrderItemId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'purchase_unit_id', type: 'uuid' })
  purchaseUnitId: string;

  @Column({
    name: 'received_qty_purchase_unit',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  receivedQtyPurchaseUnit: string;

  @Column({
    name: 'received_qty_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  receivedQtyBase: string;

  @Column({
    name: 'conversion_factor_used',
    type: 'numeric',
    precision: 10,
    scale: 4,
  })
  conversionFactorUsed: string;

  @Column({
    name: 'provisional_cost_unit_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  provisionalCostUnitNet: string;

  @Column({
    name: 'provisional_subtotal_net',
    type: 'numeric',
    precision: 24,
    scale: 4,
  })
  provisionalSubtotalNet: string;

  @Column({ name: 'stock_movement_id', type: 'uuid', unique: true })
  stockMovementId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => GoodsReceipt, (gr) => gr.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt?: GoodsReceipt;

  @ManyToOne(() => PurchaseOrderItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem?: PurchaseOrderItem;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit?: Unit;

  @ManyToOne(() => StockMovement, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_movement_id' })
  stockMovement?: StockMovement;
}

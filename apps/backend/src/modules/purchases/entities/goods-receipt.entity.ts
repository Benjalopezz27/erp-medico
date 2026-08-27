import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';
import { SupplierInvoice } from './supplier-invoice.entity';

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'receipt_number',
    type: 'varchar',
    length: 30,
    unique: true,
  })
  receiptNumber: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'delivery_note_number', type: 'varchar', length: 50 })
  deliveryNoteNumber: string;

  @Column({ name: 'delivery_note_normalized', type: 'varchar', length: 50 })
  deliveryNoteNormalized: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt)
  items?: GoodsReceiptItem[];

  @OneToMany(() => SupplierInvoice, (invoice) => invoice.goodsReceipt)
  supplierInvoices?: SupplierInvoice[];
}

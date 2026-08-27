import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierInvoiceStatus } from '@erp/shared-types';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { SupplierInvoiceItem } from './supplier-invoice-item.entity';

@Entity('supplier_invoices')
export class SupplierInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({ name: 'invoice_number_normalized', type: 'varchar', length: 50 })
  invoiceNumberNormalized: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ type: 'varchar', length: 30 })
  status: SupplierInvoiceStatus;

  @Column({ name: 'net_total', type: 'numeric', precision: 24, scale: 4 })
  netTotal: string;

  @Column({ name: 'tax_total', type: 'numeric', precision: 24, scale: 4 })
  taxTotal: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 24, scale: 4 })
  totalAmount: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.supplierInvoices, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt?: GoodsReceipt;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => SupplierInvoiceItem, (item) => item.supplierInvoice)
  items?: SupplierInvoiceItem[];
}

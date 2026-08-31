import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, SaleStatus } from '@erp/shared-types';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';
import { FiscalDocument } from './fiscal-document.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_number', type: 'varchar', length: 30, unique: true })
  saleNumber: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 20, default: SaleStatus.BORRADOR })
  status: SaleStatus;

  @Column({ name: 'is_credit_sale', type: 'boolean', default: false })
  isCreditSale: boolean;

  @Column({ name: 'requires_fiscal_invoice', type: 'boolean', default: false })
  requiresFiscalInvoice: boolean;

  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  paymentMethod: PaymentMethod;

  @Column({ name: 'total_net', type: 'numeric', precision: 14, scale: 2 })
  totalNet: string;

  @Column({ name: 'iva_total', type: 'numeric', precision: 14, scale: 2 })
  ivaTotal: string;

  @Column({ name: 'total_gross', type: 'numeric', precision: 14, scale: 2 })
  totalGross: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToMany(() => SaleItem, (item) => item.sale)
  items?: SaleItem[];

  @OneToOne(() => FiscalDocument, (document) => document.sale)
  fiscalDocument?: FiscalDocument | null;
}

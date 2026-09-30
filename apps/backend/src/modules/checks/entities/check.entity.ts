import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CheckStatus } from '@erp/shared-types';
import { Customer } from '../../customers/entities/customer.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('checks')
export class Check {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @OneToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({ name: 'check_number', type: 'varchar', length: 30 })
  checkNumber: string;

  @Column({ name: 'drawer_name', type: 'varchar', length: 150 })
  drawerName: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: string | null;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({
    name: 'received_date',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  receivedDate: string;

  @Column({ type: 'varchar', length: 20, default: CheckStatus.RECIBIDO })
  status: CheckStatus;

  @Column({ name: 'endorsed_to_supplier_id', type: 'uuid', nullable: true })
  endorsedToSupplierId: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'endorsed_to_supplier_id' })
  endorsedToSupplier?: Supplier | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  rejectionReason: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

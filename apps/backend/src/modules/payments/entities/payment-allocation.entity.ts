import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentAllocationType } from '@erp/shared-types';
import { AccountReceivable } from '../../receivables/entities/account-receivable.entity';
import { Payment } from './payment.entity';

@Entity('payment_allocations')
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (p) => p.allocations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({ name: 'account_receivable_id', type: 'uuid' })
  accountReceivableId: string;

  @ManyToOne(() => AccountReceivable, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_receivable_id' })
  accountReceivable?: AccountReceivable;

  @Column({
    name: 'amount_allocated',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  amountAllocated: string;

  @Column({ name: 'allocation_type', type: 'varchar', length: 20 })
  allocationType: PaymentAllocationType;
}

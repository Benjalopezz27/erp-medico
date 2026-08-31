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
import { AccountReceivableStatus } from '@erp/shared-types';
import { Customer } from '../../customers/entities/customer.entity';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { AccountReceivableMovement } from './account-receivable-movement.entity';

@Entity('account_receivables')
export class AccountReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'sale_id', type: 'uuid', unique: true })
  saleId: string;

  @Column({ name: 'fiscal_document_id', type: 'uuid', unique: true })
  fiscalDocumentId: string;

  @Column({ name: 'document_reference', type: 'varchar', length: 100 })
  documentReference: string;

  @Column({ name: 'original_amount', type: 'numeric', precision: 14, scale: 2 })
  originalAmount: string;

  @Column({ name: 'current_balance', type: 'numeric', precision: 14, scale: 2 })
  currentBalance: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AccountReceivableStatus.PENDIENTE,
  })
  status: AccountReceivableStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @OneToOne(() => Sale, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;

  @OneToOne(() => FiscalDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fiscal_document_id' })
  fiscalDocument?: FiscalDocument;

  @OneToMany(() => AccountReceivableMovement, (m) => m.accountReceivable)
  movements?: AccountReceivableMovement[];
}

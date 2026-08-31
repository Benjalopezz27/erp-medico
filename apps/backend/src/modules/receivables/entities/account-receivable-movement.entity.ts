import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountReceivableMovementType } from '@erp/shared-types';
import { User } from '../../users/entities/user.entity';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { SaleReturn } from '../../sales/returns/entities/sale-return.entity';
import { AccountReceivable } from './account-receivable.entity';

@Entity('account_receivable_movements')
export class AccountReceivableMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_receivable_id', type: 'uuid' })
  accountReceivableId: string;

  @ManyToOne(() => AccountReceivable, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_receivable_id' })
  accountReceivable: AccountReceivable;

  @Column({
    name: 'movement_type',
    type: 'varchar',
    length: 50,
  })
  movementType: AccountReceivableMovementType;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  amount: string;

  @Column({
    name: 'previous_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  previousBalance: string;

  @Column({
    name: 'subsequent_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  subsequentBalance: string;

  @Column({ name: 'fiscal_document_id', type: 'uuid', nullable: true })
  fiscalDocumentId: string | null;

  @ManyToOne(() => FiscalDocument, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fiscal_document_id' })
  fiscalDocument?: FiscalDocument | null;

  @Column({ name: 'sale_return_id', type: 'uuid', nullable: true })
  saleReturnId: string | null;

  @ManyToOne(() => SaleReturn, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_return_id' })
  saleReturn?: SaleReturn | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

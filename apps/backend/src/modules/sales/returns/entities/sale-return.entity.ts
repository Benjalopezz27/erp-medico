import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Sale } from '../../entities/sale.entity';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { SaleReturnItem } from './sale-return-item.entity';

@Entity('sale_returns')
export class SaleReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @ManyToOne(() => Sale, (sale) => sale.returns, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({
    name: 'taxable_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  taxableNet: string;

  @Column({
    name: 'exempt_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  exemptAmount: string;

  @Column({
    name: 'non_taxed_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  nonTaxedAmount: string;

  @Column({
    name: 'total_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  totalNet: string;

  @Column({
    name: 'iva_total',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  ivaTotal: string;

  @Column({
    name: 'total_gross',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  totalGross: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  idempotencyKey: string | null;

  @Column({ name: 'request_hash', type: 'varchar', length: 64, nullable: true })
  requestHash: string | null;

  @OneToOne(() => FiscalDocument, (doc) => doc.saleReturn, { nullable: true })
  fiscalDocument?: FiscalDocument | null;

  @OneToMany(() => SaleReturnItem, (item) => item.saleReturn, { cascade: true })
  items: SaleReturnItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MarkupLevel, PriceReviewStatus } from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { SupplierInvoice } from './supplier-invoice.entity';

@Entity('price_reviews')
export class PriceReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_invoice_id', type: 'uuid' })
  supplierInvoiceId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_code_snapshot', type: 'varchar', length: 50 })
  productCodeSnapshot: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 200 })
  productNameSnapshot: string;

  @Column({
    name: 'previous_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
  })
  previousCostNet: string;

  @Column({ name: 'new_cost_net', type: 'numeric', precision: 12, scale: 4 })
  newCostNet: string;

  @Column({
    name: 'markup_percentage_snapshot',
    type: 'numeric',
    precision: 8,
    scale: 4,
    nullable: true,
  })
  markupPercentageSnapshot: string | null;

  @Column({
    name: 'effective_markup_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  effectiveMarkupLevel: MarkupLevel | null;

  @Column({
    name: 'effective_markup_configuration_id',
    type: 'uuid',
    nullable: true,
  })
  effectiveMarkupConfigurationId: string | null;

  @Column({ name: 'effective_markup_target_id', type: 'uuid', nullable: true })
  effectiveMarkupTargetId: string | null;

  @Column({
    name: 'effective_markup_target_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  effectiveMarkupTargetName: string | null;

  @Column({
    name: 'previous_suggested_price_net',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  previousSuggestedPriceNet: string;

  @Column({
    name: 'suggested_price_net',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  suggestedPriceNet: string;

  @Column({
    name: 'active_price_net_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  activePriceNetSnapshot: string;

  @Column({
    name: 'approved_price_net',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  approvedPriceNet: string | null;

  @Column({ type: 'varchar', length: 20, default: PriceReviewStatus.PENDIENTE })
  status: PriceReviewStatus;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.priceReviews, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_invoice_id' })
  supplierInvoice?: SupplierInvoice;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser?: User | null;
}

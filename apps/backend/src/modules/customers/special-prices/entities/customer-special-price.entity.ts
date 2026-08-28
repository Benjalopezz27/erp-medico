import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Product } from '../../../products/entities/product.entity';
import { Customer } from '../../entities/customer.entity';

@Entity('customer_special_prices')
export class CustomerSpecialPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({
    name: 'special_price_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  specialPriceNet: string | null;

  @Column({
    name: 'discount_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  discountPercentage: string | null;

  @VersionColumn({ type: 'integer', default: 1 })
  version: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

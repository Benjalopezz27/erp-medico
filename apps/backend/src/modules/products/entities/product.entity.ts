import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ProductStatus } from '@erp/shared-types';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { ProductUnitConversion } from './product-unit-conversion.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'internal_code', type: 'varchar', length: 50 })
  internalCode: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'base_unit_id', type: 'uuid' })
  baseUnitId: string;

  @Column({
    name: 'min_stock',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minStock: string | number;

  @Column({
    name: 'cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: 0,
  })
  costNet: string | number;

  @Column({
    name: 'markup_percentage',
    type: 'numeric',
    precision: 8,
    scale: 4,
    nullable: true,
  })
  markupPercentage: string | number | null;

  @Column({
    name: 'suggested_price_net',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  suggestedPriceNet: string | number;

  @Column({
    name: 'active_price_net',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  activePriceNet: string | number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit?: Unit;

  @OneToMany(() => ProductUnitConversion, (conversion) => conversion.product, {
    cascade: ['insert'],
  })
  conversions?: ProductUnitConversion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields(): void {
    if (this.internalCode) {
      this.internalCode = this.internalCode.trim().toUpperCase();
    }
    if (this.name) {
      this.name = this.name.trim();
    }
    if (this.description !== undefined) {
      this.description =
        this.description && this.description.trim() !== ''
          ? this.description.trim()
          : null;
    }
  }
}

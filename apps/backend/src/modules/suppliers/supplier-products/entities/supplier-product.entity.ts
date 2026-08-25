import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Supplier } from '../../entities/supplier.entity';
import { Product } from '../../../products/entities/product.entity';
import { Unit } from '../../../units/entities/unit.entity';

@Entity('supplier_products')
export class SupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'supplier_external_code', type: 'varchar', length: 100 })
  supplierExternalCode: string;

  @Column({
    name: 'supplier_description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  supplierDescription: string | null;

  @Column({ name: 'purchase_unit_id', type: 'uuid' })
  purchaseUnitId: string;

  @Column({
    name: 'conversion_factor_to_base',
    type: 'numeric',
    precision: 10,
    scale: 4,
  })
  conversionFactorToBase: string | number;

  @Column({
    name: 'usual_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  usualCostNet: string | number | null;

  @Column({ name: 'is_primary_supplier', type: 'boolean', default: false })
  isPrimarySupplier: boolean;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_unit_id' })
  purchaseUnit?: Unit;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields(): void {
    if (this.supplierExternalCode) {
      this.supplierExternalCode = this.supplierExternalCode.trim();
    }
    if (this.supplierDescription !== undefined) {
      this.supplierDescription =
        this.supplierDescription && this.supplierDescription.trim() !== ''
          ? this.supplierDescription.trim()
          : null;
    }
  }
}

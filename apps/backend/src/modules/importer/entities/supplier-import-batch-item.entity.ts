import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierImportBatch } from './supplier-import-batch.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('supplier_import_batch_items')
export class SupplierImportBatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: false })
  batchId: string;

  @ManyToOne(() => SupplierImportBatch, (b) => b.items, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'batch_id' })
  batch: SupplierImportBatch;

  @Column({ name: 'row_number', type: 'integer', nullable: false })
  rowNumber: number;

  @Column({ name: 'supplier_product_id', type: 'uuid', nullable: false })
  supplierProductId: string;

  @ManyToOne(() => SupplierProduct, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct: SupplierProduct;

  @Column({ name: 'product_id', type: 'uuid', nullable: false })
  productId: string;

  @ManyToOne(() => Product, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'supplier_sku_snapshot',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  supplierSkuSnapshot: string;

  @Column({
    name: 'previous_usual_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  previousUsualCostNet: string | null;

  @Column({
    name: 'new_usual_cost_net',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: false,
  })
  newUsualCostNet: string;

  @Column({
    name: 'previous_description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  previousDescription: string | null;

  @Column({
    name: 'new_description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  newDescription: string | null;

  @Column({ name: 'cost_changed', type: 'boolean', nullable: false })
  costChanged: boolean;

  @Column({ name: 'description_changed', type: 'boolean', nullable: false })
  descriptionChanged: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  createdAt: Date;
}

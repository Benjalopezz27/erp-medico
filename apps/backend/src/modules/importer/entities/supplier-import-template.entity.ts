import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { ISupplierImportMapping } from '@erp/shared-types';

@Entity('supplier_import_templates')
export class SupplierImportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'header_fingerprint', type: 'varchar', length: 64 })
  headerFingerprint: string;

  @Column({ type: 'jsonb' })
  mapping: ISupplierImportMapping;

  @Column({ name: 'headers_snapshot', type: 'jsonb' })
  headersSnapshot: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

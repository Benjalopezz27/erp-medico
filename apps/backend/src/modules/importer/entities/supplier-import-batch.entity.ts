import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { SupplierImportTemplate } from './supplier-import-template.entity';
import { SupplierImportBatchItem } from './supplier-import-batch-item.entity';
import { ISupplierImportMapping } from '@erp/shared-types';

@Entity('supplier_import_batches')
export class SupplierImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: false })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'actor_id', type: 'uuid', nullable: false })
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => SupplierImportTemplate, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'template_id' })
  template?: SupplierImportTemplate | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: false })
  fileName: string;

  @Column({
    name: 'file_checksum',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  fileChecksum: string;

  @Column({
    name: 'header_fingerprint',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  headerFingerprint: string;

  @Column({
    name: 'mapping_checksum',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  mappingChecksum: string;

  @Index()
  @Column({
    name: 'content_checksum',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  contentChecksum: string;

  @Column({ name: 'mapping_snapshot', type: 'jsonb', nullable: false })
  mappingSnapshot: ISupplierImportMapping;

  @Column({ name: 'total_rows', type: 'integer', nullable: false })
  totalRows: number;

  @Column({ name: 'applied_rows', type: 'integer', nullable: false })
  appliedRows: number;

  @Column({ name: 'changed_rows', type: 'integer', nullable: false })
  changedRows: number;

  @Column({ name: 'unchanged_rows', type: 'integer', nullable: false })
  unchangedRows: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  createdAt: Date;

  @OneToMany(() => SupplierImportBatchItem, (item) => item.batch)
  items?: SupplierImportBatchItem[];
}

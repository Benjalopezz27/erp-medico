import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductImportBatchResult } from '@erp/shared-types';
import { User } from '../../users/entities/user.entity';

@Entity('product_import_batches')
export class ProductImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({
    name: 'content_checksum',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  contentChecksum: string;

  @Column({
    name: 'file_checksum',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  fileChecksum: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: false })
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'row_count', type: 'integer', nullable: false })
  rowCount: number;

  @Column({ name: 'movement_count', type: 'integer', nullable: false })
  movementCount: number;

  @Column({
    name: 'total_quantity_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: false,
  })
  totalQuantityBase: string;

  @Column({
    name: 'result',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: ProductImportBatchResult.COMPLETED,
  })
  result: ProductImportBatchResult;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  createdAt: Date;
}

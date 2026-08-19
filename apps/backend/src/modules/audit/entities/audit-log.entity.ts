import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditAction } from '@erp/shared-types';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
@Index('IDX_audit_logs_entity_query', ['entityName', 'entityId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  @Index('IDX_audit_logs_actor')
  actorId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId!: string;

  @Column({ name: 'previous_values', type: 'jsonb', nullable: true })
  previousValues!: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, IAuditLog } from '@erp/shared-types';

export class AuditLogActorDto {
  @ApiProperty({ description: 'User ID of the actor' })
  id!: string;

  @ApiProperty({ description: 'Full name of the actor' })
  name!: string;

  @ApiProperty({ description: 'Email address of the actor' })
  email!: string;

  @ApiProperty({ description: 'Role of the actor' })
  role!: string;
}

export class AuditLogResponseDto implements IAuditLog {
  @ApiProperty({ description: 'Unique audit log UUID identifier' })
  id!: string;

  @ApiProperty({ description: 'User ID of the actor who performed the mutation' })
  actorId!: string;

  @ApiPropertyOptional({
    description: 'Actor public profile if available',
    type: AuditLogActorDto,
  })
  actor?: AuditLogActorDto;

  @ApiProperty({
    description: 'Audited action type',
    enum: AuditAction,
  })
  action!: AuditAction;

  @ApiProperty({ description: 'Target entity name', example: 'User' })
  entityName!: string;

  @ApiProperty({ description: 'Target entity identifier (UUID)' })
  entityId!: string;

  @ApiPropertyOptional({
    description: 'Sanitized state snapshot prior to mutation',
    type: Object,
    nullable: true,
  })
  previousValues?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Sanitized state snapshot following mutation',
    type: Object,
    nullable: true,
  })
  newValues?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Timestamp when the audit log was recorded' })
  createdAt!: Date | string;
}

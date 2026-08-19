import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '@erp/shared-types';
import { sanitizeAuditSnapshot } from './utils/sanitizer.utils';
import { AuditQueryDto } from './dto/audit-query.dto';
import { PaginatedAuditLogsResponseDto } from './dto/paginated-audit-response.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

export interface AuditEventInput {
  actorId: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Records an immutable audit log within the provided active transaction EntityManager.
   * Mandating manager guarantees that audit creation is atomic with the domain mutation.
   */
  async record(
    manager: EntityManager,
    event: AuditEventInput,
  ): Promise<AuditLog> {
    const repo = manager.getRepository(AuditLog);

    const sanitizedPrevious = event.previousValues
      ? sanitizeAuditSnapshot(event.previousValues)
      : null;
    const sanitizedNew = event.newValues
      ? sanitizeAuditSnapshot(event.newValues)
      : null;

    const auditLog = repo.create({
      actorId: event.actorId,
      action: event.action,
      entityName: event.entityName,
      entityId: event.entityId,
      previousValues: sanitizedPrevious,
      newValues: sanitizedNew,
    });

    return repo.save(auditLog);
  }

  /**
   * Queries paginated audit logs for a specific entity type and entity ID.
   */
  async findEntityAuditLogs(
    entityName: string,
    entityId: string,
    query: AuditQueryDto,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const { page = 1, limit = 10, action } = query;
    const skip = (page - 1) * limit;

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where('audit.entityName = :entityName', { entityName })
      .andWhere('audit.entityId = :entityId', { entityId });

    if (action) {
      qb.andWhere('audit.action = :action', { action });
    }

    qb.orderBy('audit.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const data: AuditLogResponseDto[] = items.map((item) => ({
      id: item.id,
      actorId: item.actorId,
      actor: item.actor
        ? {
            id: item.actor.id,
            name: item.actor.name,
            email: item.actor.email,
            role: item.actor.role,
          }
        : undefined,
      action: item.action,
      entityName: item.entityName,
      entityId: item.entityId,
      previousValues: item.previousValues,
      newValues: item.newValues,
      createdAt: item.createdAt,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}

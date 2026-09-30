import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CheckErrorCode,
  CheckStatus,
  ICheckDetail,
  ICheckListItem,
  ICheckListResponse,
} from '@erp/shared-types';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ReceivablesService } from '../receivables/receivables.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { QueryChecksDto } from './dto/query-checks.dto';
import { Check } from './entities/check.entity';

type TransitionAction = 'to-cartera' | 'deposit' | 'endorse' | 'reject';

const TRANSITIONS: Record<
  TransitionAction,
  { from: CheckStatus[]; to: CheckStatus }
> = {
  'to-cartera': { from: [CheckStatus.RECIBIDO], to: CheckStatus.EN_CARTERA },
  deposit: { from: [CheckStatus.EN_CARTERA], to: CheckStatus.DEPOSITADO },
  endorse: { from: [CheckStatus.EN_CARTERA], to: CheckStatus.ENDOSADO },
  reject: {
    from: [CheckStatus.EN_CARTERA, CheckStatus.DEPOSITADO],
    to: CheckStatus.RECHAZADO,
  },
};

@Injectable()
export class ChecksService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly receivables: ReceivablesService,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'checks', status: 'initialized' };
  }

  async list(query: QueryChecksDto): Promise<ICheckListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const repo = this.dataSource.getRepository(Check);
    const qb = repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.customer', 'customer');
    if (query.status)
      qb.andWhere('c.status = :status', { status: query.status });
    if (query.dueFrom)
      qb.andWhere('c.dueDate >= :from', { from: query.dueFrom });
    if (query.dueTo) qb.andWhere('c.dueDate <= :to', { to: query.dueTo });
    const [rows, total] = await qb
      .orderBy('c.dueDate', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    // CURRENT_DATE de la base: sin desfase de zona horaria del servidor de app.
    const dueSoonCount = await repo
      .createQueryBuilder('c')
      .where('c.status IN (:...open)', {
        open: [CheckStatus.RECIBIDO, CheckStatus.EN_CARTERA],
      })
      .andWhere(
        "c.dueDate BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'",
      )
      .getCount();
    return {
      data: rows.map(toListItem),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      dueSoonCount,
    };
  }

  async detail(id: string): Promise<ICheckDetail> {
    const check = await this.dataSource
      .getRepository(Check)
      .findOne({ where: { id }, relations: { customer: true } });
    if (!check) throw new NotFoundException('Cheque no encontrado.');
    return { ...toListItem(check), rejectionImpact: null };
  }

  toCartera(id: string, userId: string): Promise<Check> {
    return this.transition(id, 'to-cartera', userId);
  }

  deposit(id: string, userId: string): Promise<Check> {
    return this.transition(id, 'deposit', userId);
  }

  endorse(id: string, supplierId: string, userId: string): Promise<Check> {
    return this.transition(id, 'endorse', userId, async (manager, check) => {
      const supplier = await manager
        .getRepository(Supplier)
        .findOne({ where: { id: supplierId } });
      if (!supplier) throw new NotFoundException('Proveedor no encontrado.');
      check.endorsedToSupplierId = supplierId;
    });
  }

  /**
   * Bloquea la fila del cheque, valida el estado de origen, aplica el cambio y
   * audita, todo en una transacción: dos transiciones concurrentes se
   * serializan y la perdedora ve el estado nuevo (409).
   */
  private transition(
    id: string,
    action: TransitionAction,
    userId: string,
    mutate?: (manager: EntityManager, check: Check) => Promise<void>,
  ): Promise<Check> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Check);
      const check = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!check) throw new NotFoundException('Cheque no encontrado.');
      const rule = TRANSITIONS[action];
      if (!rule.from.includes(check.status)) {
        throw new ConflictException({
          code: CheckErrorCode.CHECK_INVALID_TRANSITION,
          message: `No se puede pasar de ${check.status} a ${rule.to}.`,
        });
      }
      const previous = check.status;
      await mutate?.(manager, check);
      check.status = rule.to;
      const saved = await repo.save(check);
      await this.audit.record(manager, {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityName: 'Check',
        entityId: id,
        previousValues: { status: previous },
        newValues: {
          status: rule.to,
          ...(check.endorsedToSupplierId && action === 'endorse'
            ? { endorsedToSupplierId: check.endorsedToSupplierId }
            : {}),
        },
      });
      return saved;
    });
  }
}

function toListItem(check: Check): ICheckListItem {
  return {
    id: check.id,
    paymentId: check.paymentId,
    customerId: check.customerId,
    customerName: check.customer?.businessName ?? '',
    bankName: check.bankName,
    checkNumber: check.checkNumber,
    drawerName: check.drawerName,
    amount: check.amount,
    issueDate: check.issueDate,
    dueDate: check.dueDate,
    receivedDate: check.receivedDate,
    status: check.status,
    endorsedToSupplierId: check.endorsedToSupplierId,
    rejectedAt: check.rejectedAt,
    rejectionReason: check.rejectionReason,
    updatedAt: check.updatedAt,
  };
}

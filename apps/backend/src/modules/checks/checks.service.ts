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
  PaymentStatus,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AccountReceivable } from '../receivables/entities/account-receivable.entity';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity';
import { Payment } from '../payments/entities/payment.entity';
import {
  planReversal,
  ReceivablesService,
} from '../receivables/receivables.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { QueryChecksDto } from './dto/query-checks.dto';
import { TreasuryService } from '../treasury/treasury.service';
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
    private readonly treasury: TreasuryService,
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
    const base = { ...toListItem(check), rejectionImpact: null };
    const rejectable = TRANSITIONS.reject.from.includes(check.status);
    if (!rejectable) return { ...base, rejectionBlockedReason: null };

    const allocations = await this.dataSource
      .getRepository(PaymentAllocation)
      .find({
        where: { paymentId: check.paymentId },
        relations: { accountReceivable: true },
      });
    try {
      const impact = planReversal(
        allocations.map((a) => a.accountReceivable as AccountReceivable),
        allocations.map((a) => ({
          accountReceivableId: a.accountReceivableId,
          amount: a.amountAllocated,
        })),
      );
      return { ...base, rejectionImpact: impact, rejectionBlockedReason: null };
    } catch (err) {
      if (!(err instanceof ConflictException)) throw err;
      const body = err.getResponse() as { message?: string };
      return { ...base, rejectionBlockedReason: body.message ?? err.message };
    }
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
   * Rechazo: en la misma transacción revierte la aplicación del cobro en el
   * ledger, marca el cobro REVERTIDO y audita cheque y cobro.
   */
  reject(
    id: string,
    reason: string | undefined,
    userId: string,
  ): Promise<Check> {
    return this.transition(id, 'reject', userId, async (manager, check) => {
      const allocations = await manager
        .getRepository(PaymentAllocation)
        .find({ where: { paymentId: check.paymentId } });
      await this.receivables.reversePayment(manager, {
        paymentId: check.paymentId,
        userId,
        allocations: allocations.map((a) => ({
          accountReceivableId: a.accountReceivableId,
          amount: a.amountAllocated,
        })),
      });
      await manager
        .getRepository(Payment)
        .update({ id: check.paymentId }, { status: PaymentStatus.REVERTIDO });
      await this.audit.record(manager, {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityName: 'Payment',
        entityId: check.paymentId,
        previousValues: { status: PaymentStatus.REGISTRADO },
        newValues: { status: PaymentStatus.REVERTIDO },
      });
      check.rejectedAt = new Date();
      check.rejectionReason = reason ?? null;
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
      await this.recordTreasury(manager, action, check, previous, userId);
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

  /** Mueve el monto entre cuentas de tesorería según la transición, en la misma transacción. */
  private async recordTreasury(
    manager: EntityManager,
    action: TransitionAction,
    check: Check,
    previous: CheckStatus,
    userId: string,
  ): Promise<void> {
    const move = (
      accountType: TreasuryAccountType,
      movementType: TreasuryMovementType,
      verb: string,
    ) =>
      this.treasury.recordMovement(manager, {
        accountType,
        movementType,
        amount: check.amount,
        concept: `Cheque ${check.bankName} N° ${check.checkNumber} ${verb}`,
        referenceType: 'CHECK',
        referenceId: check.id,
        userId,
      });
    const { CHEQUES_CARTERA, BANCOS } = TreasuryAccountType;
    const { INGRESO, EGRESO } = TreasuryMovementType;
    if (action === 'deposit') {
      await move(CHEQUES_CARTERA, EGRESO, 'depositado');
      await move(BANCOS, INGRESO, 'depositado');
    } else if (action === 'endorse') {
      await move(CHEQUES_CARTERA, EGRESO, 'endosado');
    } else if (action === 'reject') {
      const origin =
        previous === CheckStatus.DEPOSITADO ? BANCOS : CHEQUES_CARTERA;
      await move(origin, EGRESO, 'rechazado');
    }
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

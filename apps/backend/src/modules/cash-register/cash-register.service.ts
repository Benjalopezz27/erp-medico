import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  ICashRegisterSession,
  ICashRegisterState,
  ITreasuryMovement,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { TreasuryService } from '../treasury/treasury.service';
import {
  CloseCashRegisterDto,
  OpenCashRegisterDto,
} from './dto/cash-register.dto';
import { CashRegister } from './entities/cash-register.entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly treasury: TreasuryService,
    private readonly audit: AuditService,
  ) {}

  async getState(): Promise<ICashRegisterState> {
    const repo = this.dataSource.getRepository(CashRegister);
    const open = await repo.findOne({ where: { closedAt: IsNull() } });
    if (!open) {
      const last = await repo.findOne({
        where: {},
        order: { closedAt: 'DESC' },
      });
      return {
        open: null,
        movements: [],
        lastClosed: last?.closedAt ? toSession(last) : null,
      };
    }
    const movements = await this.treasury.listCashMovementsSince(
      this.dataSource.manager,
      open.openedAt,
    );
    return {
      open: {
        ...toSession(open),
        expectedBalance: expectedBalance(open, movements),
      },
      movements,
      lastClosed: null,
    };
  }

  open(dto: OpenCashRegisterDto, userId: string): Promise<CashRegister> {
    return this.dataSource
      .transaction(async (manager) => {
        const repo = manager.getRepository(CashRegister);
        if (await repo.findOne({ where: { closedAt: IsNull() } })) {
          throw new ConflictException('Ya hay una caja abierta.');
        }
        const saved = await repo.save(
          repo.create({
            openingBalance: new Decimal(dto.openingBalance).toFixed(2),
            openedBy: userId,
          }),
        );
        await this.audit.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'CashRegister',
          entityId: saved.id,
          previousValues: null,
          newValues: { openingBalance: saved.openingBalance },
        });
        return saved;
      })
      .catch((e: { code?: string }) => {
        if (e?.code === UNIQUE_VIOLATION) {
          throw new ConflictException('Ya hay una caja abierta.');
        }
        throw e;
      });
  }

  close(dto: CloseCashRegisterDto, userId: string): Promise<CashRegister> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CashRegister);
      const open = await repo.findOne({
        where: { closedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!open) throw new ConflictException('No hay una caja abierta.');

      const movements = await this.treasury.listCashMovementsSince(
        manager,
        open.openedAt,
      );
      const expected = expectedBalance(open, movements);
      const actual = new Decimal(dto.actualBalance).toFixed(2);
      const difference = new Decimal(actual).minus(expected);
      const observation = dto.observation?.trim() || null;
      if (!difference.isZero() && !observation) {
        throw new BadRequestException(
          'La observación es obligatoria cuando hay diferencia.',
        );
      }

      const closed = await repo.save({
        ...open,
        closedAt: new Date(),
        closedBy: userId,
        expectedBalance: expected,
        actualBalance: actual,
        difference: difference.toFixed(2),
        observation,
      });
      if (!difference.isZero()) {
        await this.recordAdjustment(manager, open.id, difference, userId);
      }
      await this.audit.record(manager, {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityName: 'CashRegister',
        entityId: open.id,
        previousValues: { closedAt: null },
        newValues: {
          expectedBalance: expected,
          actualBalance: actual,
          difference: difference.toFixed(2),
          observation,
        },
      });
      return closed;
    });
  }

  /** Deja el libro de EFECTIVO igual al efectivo contado. */
  private recordAdjustment(
    manager: EntityManager,
    cashRegisterId: string,
    difference: Decimal,
    userId: string,
  ) {
    return this.treasury.recordMovement(manager, {
      accountType: TreasuryAccountType.EFECTIVO,
      movementType: difference.isPositive()
        ? TreasuryMovementType.INGRESO
        : TreasuryMovementType.EGRESO,
      amount: difference.abs().toFixed(2),
      concept: 'Ajuste por arqueo de caja',
      referenceType: 'CASH_REGISTER',
      referenceId: cashRegisterId,
      userId,
    });
  }
}

function expectedBalance(
  register: CashRegister,
  movements: ITreasuryMovement[],
): string {
  return movements
    .reduce(
      (sum, m) =>
        m.movementType === TreasuryMovementType.INGRESO
          ? sum.plus(m.amount)
          : sum.minus(m.amount),
      new Decimal(register.openingBalance),
    )
    .toFixed(2);
}

function toSession(r: CashRegister): ICashRegisterSession {
  return {
    id: r.id,
    openedAt: r.openedAt.toISOString(),
    openingBalance: r.openingBalance,
    closedAt: r.closedAt?.toISOString() ?? null,
    expectedBalance: r.expectedBalance,
    actualBalance: r.actualBalance,
    difference: r.difference,
    observation: r.observation,
  };
}

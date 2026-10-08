import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import {
  ITreasuryMovement,
  ITreasuryMovementListResponse,
  ITreasurySummary,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import {
  CreateTreasuryMovementDto,
  QueryTreasuryMovementsDto,
  TREASURY_MOVEMENT_SORT_FIELDS,
} from './dto/treasury.dto';
import { resolveSort } from '../../common/sorting/sorting';
import { TreasuryAccount } from './entities/treasury-account.entity';
import { TreasuryMovement } from './entities/treasury-movement.entity';

export interface RecordMovementInput {
  accountType: TreasuryAccountType;
  movementType: TreasuryMovementType;
  amount: string;
  concept: string;
  referenceType?: string;
  referenceId?: string;
  userId: string | null;
}

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Property paths (not raw columns) so TypeORM skip/take keeps working.
const MOVEMENT_SORT_COLUMNS: Record<
  (typeof TREASURY_MOVEMENT_SORT_FIELDS)[number],
  string
> = {
  createdAt: 'm.createdAt',
  account: 'account.accountType',
  movementType: 'm.movementType',
  amount: 'm.amount',
  concept: 'm.concept',
  user: 'user.name',
};

@Injectable()
export class TreasuryService {
  constructor(private readonly dataSource: DataSource) {}

  /** Corre dentro de la transacción del llamador: si falla, revierte la operación de origen. */
  async recordMovement(
    manager: EntityManager,
    input: RecordMovementInput,
  ): Promise<TreasuryMovement> {
    const amount = this.parseAmount(input.amount);
    const account = await manager.findOne(TreasuryAccount, {
      where: { accountType: input.accountType },
    });
    if (!account) {
      throw new Error(`Cuenta de tesorería ${input.accountType} inexistente.`);
    }
    // Cash movements share-lock the open register: closing it (FOR UPDATE)
    // waits for in-flight ones, and later ones are stamped after the close, so
    // no movement falls between the closing snapshot and the next shift.
    if (input.accountType === TreasuryAccountType.EFECTIVO) {
      await manager.query(
        'SELECT 1 FROM cash_registers WHERE closed_at IS NULL FOR SHARE',
      );
    }
    return manager.save(TreasuryMovement, {
      createdAt: new Date(),
      treasuryAccountId: account.id,
      movementType: input.movementType,
      amount,
      concept: input.concept,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      userId: input.userId,
    });
  }

  createManual(
    dto: CreateTreasuryMovementDto,
    userId: string,
  ): Promise<TreasuryMovement> {
    return this.dataSource.transaction((manager) =>
      this.recordMovement(manager, {
        ...dto,
        referenceType: 'MANUAL',
        userId,
      }),
    );
  }

  async getSummary(): Promise<ITreasurySummary> {
    const rows: {
      account_type: TreasuryAccountType;
      name: string;
      balance: string;
    }[] = await this.dataSource.query(`
        SELECT a.account_type, a.name,
               COALESCE(SUM(CASE m.movement_type WHEN 'INGRESO' THEN m.amount ELSE -m.amount END), 0) AS balance
        FROM treasury_accounts a
        LEFT JOIN treasury_movements m ON m.treasury_account_id = a.id
        GROUP BY a.id, a.account_type, a.name
        ORDER BY a.created_at, a.account_type
      `);
    return {
      accounts: rows.map((r) => ({
        accountType: r.account_type,
        name: r.name,
        balance: new Decimal(r.balance).toFixed(2),
      })),
    };
  }

  async listMovements(
    query: QueryTreasuryMovementsDto,
  ): Promise<ITreasuryMovementListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.dataSource
      .getRepository(TreasuryMovement)
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.account', 'account')
      .leftJoinAndSelect('m.user', 'user');
    if (query.accountType) {
      qb.andWhere('account.accountType = :accountType', {
        accountType: query.accountType,
      });
    }
    if (query.movementType) {
      qb.andWhere('m.movementType = :movementType', {
        movementType: query.movementType,
      });
    }
    // Rango por día calendario argentino, extremos inclusivos.
    if (query.from) {
      qb.andWhere(`(m.created_at AT TIME ZONE '${TIME_ZONE}')::date >= :from`, {
        from: query.from,
      });
    }
    if (query.to) {
      qb.andWhere(`(m.created_at AT TIME ZONE '${TIME_ZONE}')::date <= :to`, {
        to: query.to,
      });
    }
    const sort = resolveSort(
      MOVEMENT_SORT_COLUMNS,
      query.sortBy,
      query.sortOrder,
    );
    if (sort) {
      qb.orderBy(sort.column, sort.direction).addOrderBy(
        'm.id',
        sort.direction,
      );
    } else {
      qb.orderBy('m.createdAt', 'DESC').addOrderBy('m.id', 'DESC');
    }
    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: rows.map(toMovement),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Movimientos de EFECTIVO desde `since` (más nuevo primero), para el turno de caja. */
  async listCashMovementsSince(
    manager: EntityManager,
    since: Date,
  ): Promise<ITreasuryMovement[]> {
    const rows = await manager
      .getRepository(TreasuryMovement)
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.account', 'account')
      .leftJoinAndSelect('m.user', 'user')
      .where('account.accountType = :type', {
        type: TreasuryAccountType.EFECTIVO,
      })
      .andWhere('m.createdAt >= :since', { since })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .getMany();
    return rows.map(toMovement);
  }

  private parseAmount(raw: string): string {
    let amount: Decimal;
    try {
      amount = new Decimal(raw);
    } catch {
      amount = new Decimal(0);
    }
    if (!amount.isFinite() || amount.lte(0) || amount.decimalPlaces() > 2) {
      throw new BadRequestException(
        'El monto debe ser mayor a 0 con hasta 2 decimales.',
      );
    }
    return amount.toFixed(2);
  }
}

function toMovement(m: TreasuryMovement): ITreasuryMovement {
  return {
    id: m.id,
    accountType: m.account!.accountType,
    movementType: m.movementType,
    amount: m.amount,
    concept: m.concept,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    user: m.user ? { id: m.user.id, name: m.user.name } : null,
    createdAt: m.createdAt.toISOString(),
  };
}

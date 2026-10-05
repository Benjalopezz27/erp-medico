import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountReceivableStatus,
  CustomerErrorCode,
  DebtorStatus,
  IAccountReceivable,
  ICustomerAccountResponse,
  ICustomerAccountSummary,
  ICustomerLedgerEntry,
  IReceivableAging,
  IReceivableDebtorRow,
  IReceivableDebtorsResponse,
  IReceivablesPaginationMeta,
} from '@erp/shared-types';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';
import { DEBTOR_SORT_FIELDS } from './dto/query-account.dto';
import { resolveSort } from '../../common/sorting/sorting';

// Output aliases of the `grouped` subquery in listDebtors.
const DEBTOR_SORT_COLUMNS: Record<(typeof DEBTOR_SORT_FIELDS)[number], string> =
  {
    businessName: 'business_name',
    pendingCount: 'pending_count',
    aging0to30: 'days_0_30',
    aging31to60: 'days_31_60',
    aging60Plus: 'days_61_plus',
    totalBalance: 'total_balance',
    oldestDebtDate: 'oldest_debt_date',
  };

/** Una deuda con más de estos días desde su creación es morosa. */
export const OVERDUE_DAYS = 30;
const AGING_MID_DAYS = 60;
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Días desde la creación de la factura, en fecha local argentina.
// dueDate no se usa: hoy siempre es null.
const AGE_DAYS_SQL = `(timezone('${TIME_ZONE}', now())::date - timezone('${TIME_ZONE}', ar.created_at)::date)`;

const AGING_SQL = `
  COALESCE(SUM(ar.current_balance) FILTER (WHERE ${AGE_DAYS_SQL} <= ${OVERDUE_DAYS}), 0)::numeric(14,2) AS days_0_30,
  COALESCE(SUM(ar.current_balance) FILTER (WHERE ${AGE_DAYS_SQL} > ${OVERDUE_DAYS} AND ${AGE_DAYS_SQL} <= ${AGING_MID_DAYS}), 0)::numeric(14,2) AS days_31_60,
  COALESCE(SUM(ar.current_balance) FILTER (WHERE ${AGE_DAYS_SQL} > ${AGING_MID_DAYS}), 0)::numeric(14,2) AS days_61_plus`;

interface AgingRow {
  days_0_30: string;
  days_31_60: string;
  days_61_plus: string;
}

function toAging(row: AgingRow): IReceivableAging {
  return {
    days0to30: row.days_0_30,
    days31to60: row.days_31_60,
    days61plus: row.days_61_plus,
  };
}

function toMeta(
  page: number,
  limit: number,
  total: number,
): IReceivablesPaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class ReceivablesQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async getCustomerAccount(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<ICustomerAccountResponse> {
    const [summary, pendingInvoices, ledger] = await Promise.all([
      this.getSummary(customerId),
      this.getPendingInvoices(customerId),
      this.getLedger(customerId, page, limit),
    ]);
    return { summary, pendingInvoices, ledger };
  }

  async getSummary(customerId: string): Promise<ICustomerAccountSummary> {
    const [customer] = await this.dataSource.query(
      `SELECT business_name, cuit_or_dni, credit_limit FROM customers WHERE id = $1`,
      [customerId],
    );
    if (!customer) {
      throw new NotFoundException({
        code: CustomerErrorCode.CUSTOMER_NOT_FOUND,
        message: 'El cliente no existe.',
        details: { customerId },
      });
    }

    const [row] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE ar.status = '${AccountReceivableStatus.PENDIENTE}')::int AS pending_count,
         COUNT(*) FILTER (WHERE ar.status = '${AccountReceivableStatus.PARCIAL}')::int AS partial_count,
         COALESCE(SUM(ar.current_balance), 0)::numeric(14,2) AS total_balance,
         ${AGING_SQL}
       FROM account_receivables ar
       WHERE ar.customer_id = $1
         AND ar.status <> '${AccountReceivableStatus.CANCELADO}'`,
      [customerId],
    );

    const creditLimit: string = customer.credit_limit;
    return {
      customerId,
      customerName: customer.business_name,
      customerDocument: customer.cuit_or_dni,
      totalBalance: row.total_balance,
      pendingCount: row.pending_count,
      partialCount: row.partial_count,
      creditLimit,
      // creditLimit 0 = sin límite configurado.
      exceedsCreditLimit:
        new Decimal(creditLimit).greaterThan(0) &&
        new Decimal(row.total_balance).greaterThan(creditLimit),
      aging: toAging(row),
    };
  }

  async getPendingInvoices(customerId: string): Promise<IAccountReceivable[]> {
    const rows = await this.dataSource.getRepository(AccountReceivable).find({
      where: [
        { customerId, status: AccountReceivableStatus.PENDIENTE },
        { customerId, status: AccountReceivableStatus.PARCIAL },
      ],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((ar) => ({
      id: ar.id,
      customerId: ar.customerId,
      saleId: ar.saleId,
      fiscalDocumentId: ar.fiscalDocumentId,
      documentReference: ar.documentReference,
      originalAmount: ar.originalAmount,
      currentBalance: ar.currentBalance,
      status: ar.status,
      dueDate: ar.dueDate,
      createdAt: ar.createdAt,
      updatedAt: ar.updatedAt,
    }));
  }

  /** limit `null` devuelve todo el ledger (PDF). */
  async getLedger(
    customerId: string,
    page: number,
    limit: number | null,
  ): Promise<{
    data: ICustomerLedgerEntry[];
    meta: IReceivablesPaginationMeta;
  }> {
    const paging = limit === null ? '' : `LIMIT $2 OFFSET $3`;
    const params: unknown[] =
      limit === null ? [customerId] : [customerId, limit, (page - 1) * limit];

    // El saldo corrido se calcula sobre todo el historial del cliente y
    // recién después se pagina, para que la página 2 arrastre el acumulado.
    const rows = await this.dataSource.query(
      `WITH ledger AS (
         SELECT m.id, m.created_at, m.movement_type, ar.document_reference,
                CASE WHEN m.movement_type IN ('FACTURA', 'REVERSION_CHEQUE')
                     THEN m.amount ELSE -m.amount END AS signed_amount,
                CASE WHEN m.movement_type = 'FACTURA' THEN 0 ELSE 1 END AS type_rank
         FROM account_receivable_movements m
         JOIN account_receivables ar ON ar.id = m.account_receivable_id
         WHERE ar.customer_id = $1
       ), running AS (
         SELECT *, SUM(signed_amount) OVER (
                  ORDER BY created_at, type_rank, id
                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                )::numeric(14,2) AS running_balance
         FROM ledger
       )
       SELECT id, created_at, movement_type, document_reference,
              signed_amount::numeric(14,2) AS signed_amount, running_balance
       FROM running
       ORDER BY created_at, type_rank, id
       ${paging}`,
      params,
    );
    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM account_receivable_movements m
       JOIN account_receivables ar ON ar.id = m.account_receivable_id
       WHERE ar.customer_id = $1`,
      [customerId],
    );

    return {
      data: rows.map(
        (r: Record<string, string | Date>): ICustomerLedgerEntry => ({
          id: r.id as string,
          createdAt: r.created_at,
          movementType: r.movement_type as ICustomerLedgerEntry['movementType'],
          documentReference: r.document_reference as string,
          signedAmount: r.signed_amount as string,
          runningBalance: r.running_balance as string,
        }),
      ),
      meta: toMeta(page, limit ?? Math.max(total, 1), total),
    };
  }

  async listDebtors(query: {
    search?: string;
    status?: DebtorStatus;
    sortBy?: (typeof DEBTOR_SORT_FIELDS)[number];
    sortOrder?: string;
    page: number;
    limit: number;
  }): Promise<IReceivableDebtorsResponse> {
    const params: unknown[] = [];
    const where: string[] = [
      `ar.status IN ('${AccountReceivableStatus.PENDIENTE}', '${AccountReceivableStatus.PARCIAL}')`,
    ];
    if (query.search?.trim()) {
      params.push(`%${escapeLike(query.search.trim())}%`);
      where.push(
        `(c.business_name ILIKE $${params.length} OR c.cuit_or_dni ILIKE $${params.length})`,
      );
    }
    let having = '';
    if (query.status === DebtorStatus.MOROSO) {
      having = `HAVING MAX(${AGE_DAYS_SQL}) > ${OVERDUE_DAYS}`;
    } else if (query.status === DebtorStatus.AL_DIA) {
      having = `HAVING MAX(${AGE_DAYS_SQL}) <= ${OVERDUE_DAYS}`;
    }

    const grouped = `
      SELECT c.id AS customer_id, c.business_name, c.cuit_or_dni,
             COUNT(*)::int AS pending_count,
             SUM(ar.current_balance)::numeric(14,2) AS total_balance,
             MIN(ar.created_at) AS oldest_debt_date,
             MAX(${AGE_DAYS_SQL})::int AS oldest_age_days,
             ${AGING_SQL}
      FROM account_receivables ar
      JOIN customers c ON c.id = ar.customer_id
      WHERE ${where.join(' AND ')}
      GROUP BY c.id
      ${having}`;

    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM (${grouped}) g`,
      params,
    );
    // Whitelisted aliases only; user input never reaches the SQL text.
    const sort = resolveSort(
      DEBTOR_SORT_COLUMNS,
      query.sortBy,
      query.sortOrder,
    );
    const orderBy = sort
      ? `${sort.column} ${sort.direction}, customer_id ${sort.direction}`
      : 'total_balance DESC, business_name ASC, customer_id ASC';
    const rows = await this.dataSource.query(
      `${grouped}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, (query.page - 1) * query.limit],
    );

    return {
      data: rows.map(
        (r: Record<string, string | number | Date>): IReceivableDebtorRow => ({
          customerId: r.customer_id as string,
          customerName: r.business_name as string,
          customerDocument: r.cuit_or_dni as string,
          pendingCount: r.pending_count as number,
          totalBalance: r.total_balance as string,
          oldestDebtDate: r.oldest_debt_date as Date,
          aging: toAging(r as unknown as AgingRow),
          status:
            (r.oldest_age_days as number) > OVERDUE_DAYS
              ? DebtorStatus.MOROSO
              : DebtorStatus.AL_DIA,
        }),
      ),
      meta: toMeta(query.page, query.limit, total),
    };
  }
}

import { CheckStatus } from '@erp/shared-types';
import { WhereBuilder, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const checksPortfolioReport: SqlReportSpec = {
  type: 'checks-portfolio',
  title: 'Cheques en cartera',
  columns: [
    { key: 'bank', header: 'Banco' },
    { key: 'checkNumber', header: 'N° Cheque' },
    { key: 'drawer', header: 'Librador', width: 28 },
    { key: 'customer', header: 'Cliente', width: 28 },
    { key: 'amount', header: 'Monto', type: 'money' },
    { key: 'issueDate', header: 'Fecha emisión', type: 'date' },
    { key: 'dueDate', header: 'Fecha vencimiento', type: 'date' },
    { key: 'status', header: 'Estado' },
  ],
  build: (f) => {
    const where = new WhereBuilder()
      .addIf(
        'k.status = ?',
        oneOf(f.status, Object.values(CheckStatus), 'status'),
      )
      .dateRange('k.due_date', { from: f.dueFrom, to: f.dueTo }, false);
    return {
      sql: `
        SELECT k.bank_name AS "bank", k.check_number AS "checkNumber",
               k.drawer_name AS "drawer", c.business_name AS "customer",
               k.amount AS "amount",
               to_char(k.issue_date, 'DD/MM/YYYY') AS "issueDate",
               to_char(k.due_date, 'DD/MM/YYYY') AS "dueDate",
               k.status AS "status"
        FROM checks k
        JOIN customers c ON c.id = k.customer_id
        ${where.sql()}
        ORDER BY k.due_date, k.check_number`,
      params: where.params,
    };
  },
};

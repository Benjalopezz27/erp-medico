import { checksPortfolioReport } from './checks-portfolio.report';
import { collectionsReport } from './collections.report';
import { profitabilityReport } from './profitability.report';
import { purchasesReport } from './purchases.report';
import { receivablesAgingReport } from './receivables-aging.report';
import { salesReport } from './sales.report';
import { stockMovementsReport } from './stock-movements.report';
import { stockValuationReport } from './stock-valuation.report';
import { supplierInvoicesReport } from './supplier-invoices.report';

export const REPORT_SPECS = [
  salesReport,
  profitabilityReport,
  stockValuationReport,
  stockMovementsReport,
  purchasesReport,
  receivablesAgingReport,
  collectionsReport,
  checksPortfolioReport,
  supplierInvoicesReport,
];

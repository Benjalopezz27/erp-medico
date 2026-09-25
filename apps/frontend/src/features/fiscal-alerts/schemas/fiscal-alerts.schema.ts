import { FiscalDocumentType } from '@erp/shared-types';
import type { IFiscalAlertsSearchParams } from '../types/fiscal-alerts.types';

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateFiscalAlertsSearchParams(
  search: Record<string, unknown>,
): IFiscalAlertsSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);

  const rawTab = search.tab as string | undefined;
  const tab = rawTab === 'RECHAZADO' ? 'RECHAZADO' : 'PENDIENTE_FACTURACION';

  const dateFrom = isCalendarDate(search.dateFrom) ? search.dateFrom : undefined;
  let dateTo = isCalendarDate(search.dateTo) ? search.dateTo : undefined;
  const from = dateFrom && dateTo && dateFrom > dateTo ? undefined : dateFrom;
  dateTo = dateFrom && dateTo && dateFrom > dateTo ? undefined : dateTo;

  const rawDocumentType = search.documentType as string | undefined;
  const documentType =
    rawDocumentType &&
    Object.values(FiscalDocumentType).includes(rawDocumentType as FiscalDocumentType)
      ? (rawDocumentType as FiscalDocumentType)
      : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam =
    rawSearch && rawSearch.length > 0 && rawSearch.length <= 100 ? rawSearch : undefined;

  return {
    tab,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    dateFrom: from,
    dateTo,
    documentType,
    search: searchParam,
  };
}

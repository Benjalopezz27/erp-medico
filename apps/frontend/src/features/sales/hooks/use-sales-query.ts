import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArcaStatus, type ISale, type ISaleSearchParams } from '@erp/shared-types';
import { getSaleByIdApi, getSalesApi } from '../api/sales.api';
import { salesKeys } from './sales-keys';

const FISCAL_PENDING_POLL_INTERVAL_MS = 5000;

export function useSalesQuery(params: ISaleSearchParams) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => getSalesApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useSaleDetailQuery(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => getSaleByIdApi(id),
    enabled: Boolean(id),
    retry: false,
    // El worker BullMQ emite el CAE de forma asíncrona; sin esto el detalle
    // queda con el snapshot "Pendiente" de la creación de la venta para
    // siempre (bug #236). Repolling corto solo mientras siga pendiente.
    refetchInterval: (query) => {
      const sale = query.state.data as ISale | undefined;
      return sale?.fiscalDocument?.arcaStatus === ArcaStatus.PENDIENTE_FACTURACION
        ? FISCAL_PENDING_POLL_INTERVAL_MS
        : false;
    },
  });
}

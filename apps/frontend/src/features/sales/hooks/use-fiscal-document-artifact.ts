import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IEmitFiscalDocumentResponse } from '@erp/shared-types';
import {
  downloadFiscalDocumentPdfApi,
  emitFiscalDocumentApi,
  fetchFiscalDocumentQrApi,
  getFiscalDocumentPreviewApi,
} from '../api/sales.api';
import { salesKeys } from './sales-keys';

export function useDownloadFiscalDocumentPdf() {
  return useMutation<void, Error, { saleId: string; returnId?: string; filename: string }>({
    mutationFn: async ({ saleId, returnId, filename }) => {
      const blob = await downloadFiscalDocumentPdfApi(saleId, returnId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

/** Fetched on demand (modal open), not cached as a query — the object URL
 * is revoked as soon as the modal closes, so nothing should keep it alive
 * past that. */
export function useFiscalDocumentQr() {
  return useMutation<string, Error, { saleId: string; returnId?: string }>({
    mutationFn: async ({ saleId, returnId }) => {
      const blob = await fetchFiscalDocumentQrApi(saleId, returnId);
      return window.URL.createObjectURL(blob);
    },
  });
}

export function useFiscalDocumentPreview(saleId: string, enabled: boolean) {
  return useQuery({
    queryKey: salesKeys.fiscalPreview(saleId),
    queryFn: () => getFiscalDocumentPreviewApi(saleId),
    enabled,
  });
}

export function useEmitFiscalDocument(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation<IEmitFiscalDocumentResponse, Error, void>({
    mutationFn: () => emitFiscalDocumentApi(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) });
      queryClient.invalidateQueries({ queryKey: salesKeys.fiscalPreview(saleId) });
    },
  });
}

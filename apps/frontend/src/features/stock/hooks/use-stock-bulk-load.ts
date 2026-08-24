import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  postStockBulkPreviewApi,
  postStockBulkConfirmApi,
  downloadStockTemplateApi,
} from '../api/stock.api';
import { stockKeys } from './stock-keys';
import type {
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
} from '../types/stock.types';

export function useStockBulkPreviewMutation() {
  return useMutation<IStockBulkLoadPreviewResponse, Error, File>({
    mutationFn: (file: File) => postStockBulkPreviewApi(file),
  });
}

export function useStockBulkConfirmMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IStockBulkLoadConfirmResponse,
    Error,
    { file: File; previewFileChecksum: string }
  >({
    mutationFn: ({ file, previewFileChecksum }) =>
      postStockBulkConfirmApi(file, previewFileChecksum),
    onSuccess: () => {
      // Invalidate all stock overview, alerts, movements, evolution cache
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      // Invalidate product searches
      queryClient.invalidateQueries({ queryKey: ['products', 'search'] });
    },
  });
}

export function useDownloadStockTemplate() {
  return useMutation<void, Error, 'xlsx' | 'csv'>({
    mutationFn: async (format: 'xlsx' | 'csv' = 'xlsx') => {
      const blob = await downloadStockTemplateApi(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plantilla_carga_stock.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

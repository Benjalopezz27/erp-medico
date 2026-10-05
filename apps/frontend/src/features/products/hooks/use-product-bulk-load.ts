import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  postProductBulkPreviewApi,
  postProductBulkConfirmApi,
  downloadProductTemplateApi,
} from '../api/product-bulk-load.api';
import { productKeys } from './use-products-query';
import type {
  IProductBulkLoadPreviewResponse,
  IProductBulkLoadConfirmResponse,
} from '@erp/shared-types';

export function useProductBulkPreviewMutation() {
  return useMutation<IProductBulkLoadPreviewResponse, Error, File>({
    mutationFn: (file: File) => postProductBulkPreviewApi(file),
  });
}

export function useProductBulkConfirmMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IProductBulkLoadConfirmResponse,
    Error,
    { file: File; previewFileChecksum: string }
  >({
    mutationFn: ({ file, previewFileChecksum }) =>
      postProductBulkConfirmApi(file, previewFileChecksum),
    onSuccess: () => {
      // Invalidate all products queries
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      // Invalidate stock queries
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useDownloadProductTemplate() {
  return useMutation<void, Error, 'xlsx' | 'csv'>({
    mutationFn: async (format: 'xlsx' | 'csv' = 'xlsx') => {
      const blob = await downloadProductTemplateApi(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plantilla_productos.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

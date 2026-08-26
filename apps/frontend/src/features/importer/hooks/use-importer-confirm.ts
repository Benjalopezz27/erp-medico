import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postImporterConfirmApi } from '../api/importer.api';
import { supplierProductsKeys } from '@/features/supplier-products/hooks/supplier-products-keys';
import type { IImporterConfirmPayload, IImporterConfirmResponse } from '../types/importer.types';

export function useImporterConfirmMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IImporterConfirmResponse,
    Error,
    { file: File; payload: IImporterConfirmPayload }
  >({
    mutationFn: ({ file, payload }) => postImporterConfirmApi(file, payload),
    onSuccess: () => {
      // Invalidate supplier products cache so newly updated catalog prices reflect immediately
      queryClient.invalidateQueries({ queryKey: supplierProductsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['importer-batches'] });
    },
  });
}

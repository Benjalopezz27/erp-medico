import { useQuery } from '@tanstack/react-query';
import { getImporterBatchApi } from '../api/importer.api';
import type { IImporterBatchDetailResponse } from '../types/importer.types';

export const importerBatchKeys = {
  all: ['importer-batches'] as const,
  detail: (batchId: string) => [...importerBatchKeys.all, batchId] as const,
};

export function useImporterBatchQuery(batchId: string | null | undefined) {
  return useQuery<IImporterBatchDetailResponse, Error>({
    queryKey: importerBatchKeys.detail(batchId || ''),
    queryFn: ({ signal }) => getImporterBatchApi(batchId!, signal),
    enabled: Boolean(batchId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

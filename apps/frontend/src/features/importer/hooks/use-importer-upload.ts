import { useMutation } from '@tanstack/react-query';
import { postImporterUploadApi } from '../api/importer.api';
import type { IImporterUploadResponse } from '../types/importer.types';

interface ImporterUploadVariables {
  supplierId: string;
  file: File;
  signal?: AbortSignal;
}

export function useImporterUploadMutation() {
  return useMutation<IImporterUploadResponse, Error, ImporterUploadVariables>({
    mutationFn: ({ supplierId, file, signal }) => postImporterUploadApi(supplierId, file, signal),
  });
}

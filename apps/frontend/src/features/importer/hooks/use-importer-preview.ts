import { useMutation } from '@tanstack/react-query';
import { postImporterPreviewApi } from '../api/importer.api';
import type { IImporterPreviewResponse, ISupplierImportMapping } from '../types/importer.types';

export interface ImporterPreviewVariables {
  supplierId: string;
  file: File;
  expectedFileChecksum: string;
  mapping: ISupplierImportMapping;
  signal?: AbortSignal;
}

export function useImporterPreviewMutation() {
  return useMutation<IImporterPreviewResponse, Error, ImporterPreviewVariables>({
    mutationFn: ({ supplierId, file, expectedFileChecksum, mapping, signal }) =>
      postImporterPreviewApi(supplierId, file, expectedFileChecksum, mapping, signal),
  });
}

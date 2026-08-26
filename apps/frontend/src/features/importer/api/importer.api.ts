import { apiClient } from '@/services/api.client';
import type { IImporterUploadResponse } from '../types/importer.types';

export async function postImporterUploadApi(
  supplierId: string,
  file: File,
  signal?: AbortSignal,
): Promise<IImporterUploadResponse> {
  const formData = new FormData();
  formData.append('supplierId', supplierId);
  formData.append('file', file, file.name);

  const response = await apiClient.post<IImporterUploadResponse>('/importer/upload', formData, {
    signal,
    // apiClient defaults to application/json. Clear it so Axios/browser can
    // generate the multipart boundary instead of serializing FormData as JSON.
    headers: { 'Content-Type': undefined },
  });
  return response.data;
}

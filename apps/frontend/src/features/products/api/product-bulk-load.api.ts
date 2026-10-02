import { apiClient } from '@/services/api.client';
import type {
  IProductBulkLoadPreviewResponse,
  IProductBulkLoadConfirmResponse,
} from '@erp/shared-types';

async function extractBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }
  if (typeof Response !== 'undefined') {
    return new Response(blob).text();
  }
  return '';
}

/**
 * Downloads product catalog bulk load template (CSV or XLSX).
 */
export async function downloadProductTemplateApi(format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
  try {
    const response = await apiClient.get('/products/bulk-load/template', {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  } catch (error: any) {
    const responseData = error?.response?.data;
    if (
      responseData &&
      (responseData instanceof Blob ||
        responseData?.constructor?.name === 'Blob' ||
        typeof responseData?.text === 'function')
    ) {
      try {
        const text = await extractBlobText(responseData);
        if (text) {
          const json = JSON.parse(text);
          error.response.data = json;
        }
      } catch {
        // Leave raw error if not valid JSON
      }
    }
    throw error;
  }
}

/**
 * Uploads spreadsheet file and retrieves detailed row-level preview validation.
 */
export async function postProductBulkPreviewApi(
  file: File,
): Promise<IProductBulkLoadPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<IProductBulkLoadPreviewResponse>(
    '/products/bulk-load/preview',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

/**
 * Confirms and atomically applies the bulk product catalog import.
 */
export async function postProductBulkConfirmApi(
  file: File,
  previewFileChecksum: string,
): Promise<IProductBulkLoadConfirmResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('previewFileChecksum', previewFileChecksum);

  const { data } = await apiClient.post<IProductBulkLoadConfirmResponse>(
    '/products/bulk-load/confirm',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

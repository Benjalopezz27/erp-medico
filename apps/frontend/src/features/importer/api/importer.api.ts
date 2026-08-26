import { apiClient } from '@/services/api.client';
import type {
  IImporterUploadResponse,
  ISupplierImportTemplate,
  ICreateSupplierImportTemplatePayload,
  IUpdateSupplierImportTemplatePayload,
} from '../types/importer.types';

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

export async function getSupplierImportTemplatesApi(
  supplierId: string,
  params?: { search?: string; headerFingerprint?: string },
): Promise<ISupplierImportTemplate[]> {
  const response = await apiClient.get<ISupplierImportTemplate[]>(
    `/suppliers/${supplierId}/import-templates`,
    { params },
  );
  return response.data;
}

export async function getSupplierImportTemplateApi(
  supplierId: string,
  templateId: string,
): Promise<ISupplierImportTemplate> {
  const response = await apiClient.get<ISupplierImportTemplate>(
    `/suppliers/${supplierId}/import-templates/${templateId}`,
  );
  return response.data;
}

export async function createSupplierImportTemplateApi(
  supplierId: string,
  payload: ICreateSupplierImportTemplatePayload,
): Promise<ISupplierImportTemplate> {
  const response = await apiClient.post<ISupplierImportTemplate>(
    `/suppliers/${supplierId}/import-templates`,
    payload,
  );
  return response.data;
}

export async function updateSupplierImportTemplateApi(
  supplierId: string,
  templateId: string,
  payload: IUpdateSupplierImportTemplatePayload,
): Promise<ISupplierImportTemplate> {
  const response = await apiClient.patch<ISupplierImportTemplate>(
    `/suppliers/${supplierId}/import-templates/${templateId}`,
    payload,
  );
  return response.data;
}

export async function deleteSupplierImportTemplateApi(
  supplierId: string,
  templateId: string,
): Promise<void> {
  await apiClient.delete(`/suppliers/${supplierId}/import-templates/${templateId}`);
}

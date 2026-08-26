import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSupplierImportTemplatesApi,
  createSupplierImportTemplateApi,
  updateSupplierImportTemplateApi,
  deleteSupplierImportTemplateApi,
} from '../api/importer.api';
import type {
  ICreateSupplierImportTemplatePayload,
  IUpdateSupplierImportTemplatePayload,
} from '../types/importer.types';

export function useSupplierImportTemplates(
  supplierId: string | undefined,
  params?: { search?: string; headerFingerprint?: string },
) {
  return useQuery({
    queryKey: ['supplier-import-templates', supplierId, params],
    queryFn: () => {
      if (!supplierId) return [];
      return getSupplierImportTemplatesApi(supplierId, params);
    },
    enabled: Boolean(supplierId),
  });
}

export function useCreateSupplierImportTemplate(supplierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateSupplierImportTemplatePayload) => {
      if (!supplierId) throw new Error('Proveedor no seleccionado');
      return createSupplierImportTemplateApi(supplierId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-import-templates', supplierId],
      });
    },
  });
}

export function useUpdateSupplierImportTemplate(supplierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: IUpdateSupplierImportTemplatePayload;
    }) => {
      if (!supplierId) throw new Error('Proveedor no seleccionado');
      return updateSupplierImportTemplateApi(supplierId, templateId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-import-templates', supplierId],
      });
    },
  });
}

export function useDeleteSupplierImportTemplate(supplierId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => {
      if (!supplierId) throw new Error('Proveedor no seleccionado');
      return deleteSupplierImportTemplateApi(supplierId, templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-import-templates', supplierId],
      });
    },
  });
}

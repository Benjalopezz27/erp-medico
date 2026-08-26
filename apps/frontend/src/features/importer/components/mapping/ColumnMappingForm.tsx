import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type {
  IImporterUploadResponse,
  ISupplierImportMapping,
  ISupplierImportTemplateSummary,
} from '../../types/importer.types';
import { SemanticFieldRow } from './SemanticFieldRow';
import { AppliedTemplateBadge } from './AppliedTemplateBadge';
import { SaveTemplateModal } from './SaveTemplateModal';
import { DeleteTemplateModal } from './DeleteTemplateModal';
import {
  useCreateSupplierImportTemplate,
  useUpdateSupplierImportTemplate,
  useDeleteSupplierImportTemplate,
} from '../../hooks/use-import-templates';
import { parseImporterApiError } from '../../utils/importer.errors';

interface ColumnMappingFormProps {
  supplierId: string;
  uploadResponse: IImporterUploadResponse;
  mapping: ISupplierImportMapping;
  appliedTemplate: ISupplierImportTemplateSummary | null;
  onMappingChange: (mapping: ISupplierImportMapping) => void;
  onAppliedTemplateChange: (template: ISupplierImportTemplateSummary | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const ColumnMappingForm: React.FC<ColumnMappingFormProps> = ({
  supplierId,
  uploadResponse,
  mapping,
  appliedTemplate,
  onMappingChange,
  onAppliedTemplateChange,
  onBack,
  onContinue,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const createTemplateMutation = useCreateSupplierImportTemplate(supplierId);
  const updateTemplateMutation = useUpdateSupplierImportTemplate(supplierId);
  const deleteTemplateMutation = useDeleteSupplierImportTemplate(supplierId);

  // Compute set of currently assigned normalized column names
  const usedNormalizedColumns = useMemo(() => {
    const set = new Set<string>();
    for (const val of Object.values(mapping)) {
      if (val && typeof val === 'string' && val.trim() !== '') {
        set.add(val.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' '));
      }
    }
    return set;
  }, [mapping]);

  // Check if mapping matches appliedTemplate exactly
  const isTemplateModified = useMemo(() => {
    if (!appliedTemplate) return false;
    const tMap = appliedTemplate.mapping;
    return (
      mapping.supplierSku !== tMap.supplierSku ||
      mapping.usualCostNet !== tMap.usualCostNet ||
      (mapping.supplierDescription ?? null) !== (tMap.supplierDescription ?? null) ||
      (mapping.rawQuantity ?? null) !== (tMap.rawQuantity ?? null) ||
      (mapping.purchaseUnit ?? null) !== (tMap.purchaseUnit ?? null)
    );
  }, [appliedTemplate, mapping]);

  const handleFieldChange = (field: keyof ISupplierImportMapping, value: string | null) => {
    onMappingChange({
      ...mapping,
      [field]: value,
    });
  };

  const handleUnlink = () => {
    onAppliedTemplateChange(null);
  };

  const handleSaveTemplate = async (name: string) => {
    try {
      setTemplateError(null);
      if (appliedTemplate && appliedTemplate.name === name) {
        // Update existing template
        const updated = await updateTemplateMutation.mutateAsync({
          templateId: appliedTemplate.id,
          payload: {
            name,
            mapping,
          },
        });
        onAppliedTemplateChange({
          id: updated.id,
          name: updated.name,
          headerFingerprint: updated.headerFingerprint,
          mapping: updated.mapping,
        });
      } else {
        // Create new template
        const created = await createTemplateMutation.mutateAsync({
          name,
          headerFingerprint: uploadResponse.headerFingerprint,
          headers: uploadResponse.normalizedHeaders,
          mapping,
        });
        onAppliedTemplateChange({
          id: created.id,
          name: created.name,
          headerFingerprint: created.headerFingerprint,
          mapping: created.mapping,
        });
      }
      setIsSaveModalOpen(false);
    } catch (error) {
      setTemplateError(parseImporterApiError(error));
    }
  };

  const handleDeleteTemplate = async () => {
    if (!appliedTemplate) return;
    try {
      setTemplateError(null);
      await deleteTemplateMutation.mutateAsync(appliedTemplate.id);
      onAppliedTemplateChange(null);
      setIsDeleteModalOpen(false);
    } catch (error) {
      setTemplateError(parseImporterApiError(error));
    }
  };

  const canContinue = Boolean(
    mapping.supplierSku &&
    mapping.supplierSku.trim() !== '' &&
    mapping.usualCostNet &&
    mapping.usualCostNet.trim() !== '',
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Paso 2: Mapeo de Columnas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Asigna las columnas del archivo cargado a los campos del sistema ERP. Puedes guardar
            esta configuración como una plantilla para futuras importaciones.
          </p>
        </div>

        {/* Applied Template Status & Actions */}
        <AppliedTemplateBadge
          appliedTemplate={appliedTemplate}
          onUnlink={handleUnlink}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          onOpenDeleteModal={appliedTemplate ? () => setIsDeleteModalOpen(true) : undefined}
          isModified={isTemplateModified}
        />

        {/* Mapping Table */}
        <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Campo del Sistema
                </th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 w-72">
                  Columna del Archivo
                </th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 w-64">
                  Dato de Ejemplo
                </th>
              </tr>
            </thead>
            <tbody>
              <SemanticFieldRow
                label="SKU de Proveedor"
                fieldKey="supplierSku"
                required
                description="Código o SKU único con el que el proveedor identifica el producto."
                currentValue={mapping.supplierSku}
                headers={uploadResponse.headers}
                normalizedHeaders={uploadResponse.normalizedHeaders}
                usedNormalizedColumns={usedNormalizedColumns}
                sampleRows={uploadResponse.sampleRows}
                onChange={(val) => handleFieldChange('supplierSku', val ?? '')}
              />
              <SemanticFieldRow
                label="Costo Neto Catálogo"
                fieldKey="usualCostNet"
                required
                description="Precio neto o costo de catálogo del proveedor."
                currentValue={mapping.usualCostNet}
                headers={uploadResponse.headers}
                normalizedHeaders={uploadResponse.normalizedHeaders}
                usedNormalizedColumns={usedNormalizedColumns}
                sampleRows={uploadResponse.sampleRows}
                onChange={(val) => handleFieldChange('usualCostNet', val ?? '')}
              />
              <SemanticFieldRow
                label="Descripción del Producto"
                fieldKey="supplierDescription"
                required={false}
                description="Nombre o descripción comercial provista por el proveedor."
                currentValue={mapping.supplierDescription}
                headers={uploadResponse.headers}
                normalizedHeaders={uploadResponse.normalizedHeaders}
                usedNormalizedColumns={usedNormalizedColumns}
                sampleRows={uploadResponse.sampleRows}
                onChange={(val) => handleFieldChange('supplierDescription', val)}
              />
              <SemanticFieldRow
                label="Cantidad del Bulto"
                fieldKey="rawQuantity"
                required={false}
                badgeText="Informativo"
                description="Cantidad del empaque provista por el proveedor (solo informativa, no afecta stock)."
                currentValue={mapping.rawQuantity}
                headers={uploadResponse.headers}
                normalizedHeaders={uploadResponse.normalizedHeaders}
                usedNormalizedColumns={usedNormalizedColumns}
                sampleRows={uploadResponse.sampleRows}
                onChange={(val) => handleFieldChange('rawQuantity', val)}
              />
              <SemanticFieldRow
                label="Unidad de Compra"
                fieldKey="purchaseUnit"
                required={false}
                description="Unidad o presentación del proveedor (ej: Caja, Frasco, Unidad)."
                currentValue={mapping.purchaseUnit}
                headers={uploadResponse.headers}
                normalizedHeaders={uploadResponse.normalizedHeaders}
                usedNormalizedColumns={usedNormalizedColumns}
                sampleRows={uploadResponse.sampleRows}
                onChange={(val) => handleFieldChange('purchaseUnit', val)}
              />
            </tbody>
          </table>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Carga
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              Continuar a Vista Previa
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          setTemplateError(null);
        }}
        onSave={handleSaveTemplate}
        initialName={appliedTemplate?.name ?? ''}
        isSaving={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        errorMessage={templateError}
      />

      {/* Delete Template Modal */}
      <DeleteTemplateModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTemplateError(null);
        }}
        onConfirm={handleDeleteTemplate}
        templateName={appliedTemplate?.name ?? ''}
        isDeleting={deleteTemplateMutation.isPending}
      />
    </div>
  );
};

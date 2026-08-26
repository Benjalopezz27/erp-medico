import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@/test/test-utils';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { TaxCondition } from '@erp/shared-types';
import { ImporterWizardPage } from './ImporterWizardPage';

const mutateAsync = vi.fn();

vi.mock('@/features/importer/hooks/use-importer-upload', () => ({
  useImporterUploadMutation: () => ({ mutateAsync }),
}));

vi.mock('@/features/suppliers/hooks/use-suppliers-query', () => ({
  useSuppliersQuery: () => ({
    data: {
      data: [
        {
          id: '56ab5c44-90a6-4e22-a940-3bb67939dc1f',
          businessName: 'Proveedor Médico',
          cuit: '30712345678',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
          isActive: true,
          createdAt: '2026-08-26T00:00:00.000Z',
          updatedAt: '2026-08-26T00:00:00.000Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 25,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

const preview = {
  supplier: {
    id: '56ab5c44-90a6-4e22-a940-3bb67939dc1f',
    businessName: 'Proveedor Médico',
    cuit: '30712345678',
  },
  fileName: 'lista.csv',
  fileSize: 20,
  clientMimeType: 'text/csv',
  detectedFormat: 'csv' as const,
  fileChecksum: 'a'.repeat(64),
  headerFingerprint: 'b'.repeat(64),
  headers: ['SKU', 'Costo'],
  normalizedHeaders: ['sku', 'costo'],
  totalRows: 1,
  totalColumns: 2,
  sampleRows: [{ rowNumber: 2, cells: ['001', '1250'] }],
};

describe('ImporterWizardPage', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(preview);
  });

  it('selects a supplier, uploads a file and retains the validated preview', async () => {
    const router = createTestRouter(
      [{ path: '/importer', component: ImporterWizardPage }],
      '/importer',
    );
    const rendered = renderWithRouter({ router });
    await screen.findByText('Importar archivo de proveedor');

    fireEvent.change(screen.getByLabelText('Seleccionar proveedor'), {
      target: { value: preview.supplier.id },
    });
    const input = rendered.container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['SKU,Costo\n001,1250'], 'lista.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText('Muestra del archivo');
    expect(screen.getByText('001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar al mapeo/i })).toBeEnabled();
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: preview.supplier.id, file }),
    );
  });

  it('keeps the last valid preview when a replacement fails', async () => {
    mutateAsync.mockResolvedValueOnce(preview).mockRejectedValueOnce(new Error('Archivo inválido'));
    const router = createTestRouter(
      [{ path: '/importer', component: ImporterWizardPage }],
      '/importer',
    );
    const rendered = renderWithRouter({ router });
    await screen.findByText('Importar archivo de proveedor');
    fireEvent.change(screen.getByLabelText('Seleccionar proveedor'), {
      target: { value: preview.supplier.id },
    });
    const first = new File(['a,b\n1,2'], 'lista.csv', { type: 'text/csv' });
    fireEvent.change(rendered.container.querySelector('input[type="file"]')!, {
      target: { files: [first] },
    });
    await screen.findByText('Muestra del archivo');

    fireEvent.click(screen.getByRole('button', { name: /reemplazar archivo/i }));
    const second = new File(['bad'], 'otra.csv', { type: 'text/csv' });
    fireEvent.change(rendered.container.querySelector('input[type="file"]')!, {
      target: { files: [second] },
    });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Archivo inválido'));
    expect(screen.getByText('Muestra del archivo')).toBeInTheDocument();
    expect(screen.getByText('001')).toBeInTheDocument();
  });
});

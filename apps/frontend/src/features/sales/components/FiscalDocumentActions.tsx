import { useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { ArcaStatus, PdfArtifactStatus, type IFiscalDocument } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  useDownloadFiscalDocumentPdf,
  useEmitFiscalDocument,
  useFiscalDocumentPreview,
  useFiscalDocumentQr,
} from '../hooks/use-fiscal-document-artifact';
import { buildFiscalDocumentFilename } from '../utils/fiscal-document-artifact.util';

export function FiscalDocumentActions({
  saleId,
  returnId,
  document,
}: {
  saleId: string;
  returnId?: string;
  document: IFiscalDocument | null;
}) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const downloadPdf = useDownloadFiscalDocumentPdf();
  const fetchQr = useFiscalDocumentQr();

  // Las Notas de Crédito reusan este documento para PDF/QR una vez emitidas,
  // pero el preview/emisión manual es solo para el comprobante de la venta.
  const canEmitManually = !returnId && document && document.arcaStatus !== ArcaStatus.EMITIDO;

  if (!document) return null;
  if (canEmitManually) return <PendingFiscalDocument saleId={saleId} />;
  if (document.arcaStatus !== ArcaStatus.EMITIDO) return null;

  const isAvailable = document.pdfStatus === PdfArtifactStatus.DISPONIBLE;
  const isError = document.pdfStatus === PdfArtifactStatus.ERROR;
  const isPending =
    document.pdfStatus === PdfArtifactStatus.PENDIENTE ||
    document.pdfStatus === PdfArtifactStatus.GENERANDO;

  function handleDownload() {
    downloadPdf.mutate({
      saleId,
      returnId,
      filename: buildFiscalDocumentFilename(document!, 'pdf'),
    });
  }

  function openQrModal() {
    setIsQrOpen(true);
    if (!fetchQr.data) fetchQr.mutate({ saleId, returnId });
  }

  function closeQrModal() {
    setIsQrOpen(false);
    if (fetchQr.data) window.URL.revokeObjectURL(fetchQr.data);
    fetchQr.reset();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={isError ? 'outline' : 'default'}
        size="sm"
        disabled={isPending || downloadPdf.isPending}
        onClick={handleDownload}
        className="text-xs"
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        {isError ? 'Reintentar descarga de PDF' : 'Descargar PDF'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isAvailable}
        onClick={openQrModal}
        className="text-xs"
      >
        <QrCode className="mr-1.5 h-3.5 w-3.5" />
        Ver QR
      </Button>
      {isPending && <span className="text-xs text-slate-500">Generando documento…</span>}
      {isError && (
        <span className="text-xs text-amber-700">
          No se pudo generar el documento. Podés reintentar la descarga.
        </span>
      )}

      <Modal
        isOpen={isQrOpen}
        onClose={closeQrModal}
        title="QR fiscal"
        description="Código QR oficial del comprobante para verificación en ARCA."
      >
        {fetchQr.isPending && <p className="text-sm text-slate-500">Generando QR…</p>}
        {fetchQr.isError && (
          <p className="text-sm text-red-600">No se pudo obtener el QR. Intentá nuevamente.</p>
        )}
        {fetchQr.data && (
          <img src={fetchQr.data} alt="QR fiscal del comprobante" className="mx-auto h-56 w-56" />
        )}
      </Modal>
    </div>
  );
}

const INVOICE_TYPE_LABELS: Record<string, string> = {
  FACTURA_A: 'Factura A',
  FACTURA_B: 'Factura B',
};

function PendingFiscalDocument({ saleId }: { saleId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const preview = useFiscalDocumentPreview(saleId, isOpen);
  const emit = useEmitFiscalDocument(saleId);

  function confirmEmit() {
    emit.mutate(undefined, { onSuccess: () => setIsOpen(false) });
  }

  return (
    <div className="mt-3">
      <Button type="button" size="sm" onClick={() => setIsOpen(true)} className="text-xs">
        Emitir factura
      </Button>
      {emit.isSuccess && (
        <p className="mt-1 text-xs text-emerald-700">Emisión encolada, actualizando estado…</p>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Preview del comprobante"
        description="Revisá los datos antes de emitir. La emisión no se puede deshacer."
      >
        {preview.isPending && <p className="text-sm text-slate-500">Cargando preview…</p>}
        {preview.isError && (
          <p className="text-sm text-red-600">No se pudo cargar el preview del comprobante.</p>
        )}
        {preview.data && (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">
              {INVOICE_TYPE_LABELS[preview.data.invoiceType] ?? preview.data.invoiceType} a{' '}
              {preview.data.receiver.businessName}
            </p>
            <ul className="divide-y divide-slate-100">
              {preview.data.items.map((item) => (
                <li key={item.id} className="flex justify-between py-1">
                  <span>
                    {item.quantityBase} × {item.product?.name}
                  </span>
                  <span>{item.subtotalGross}</span>
                </li>
              ))}
            </ul>
            <div className="text-right">
              <p>Neto: {preview.data.totals.totalNet}</p>
              <p>IVA: {preview.data.totals.ivaTotal}</p>
              <p className="font-medium text-slate-800">Total: {preview.data.totals.totalGross}</p>
            </div>
          </div>
        )}
        {emit.isError && (
          <p className="mt-2 text-sm text-red-600">No se pudo emitir la factura. Reintentá.</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={emit.isPending || !preview.data}
            onClick={confirmEmit}
          >
            {emit.isPending ? 'Emitiendo…' : 'Confirmar emisión'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

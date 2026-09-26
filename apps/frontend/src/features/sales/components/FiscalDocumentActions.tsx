import { useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { ArcaStatus, PdfArtifactStatus, type IFiscalDocument } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useDownloadFiscalDocumentPdf, useFiscalDocumentQr } from '../hooks/use-fiscal-document-artifact';
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

  if (!document || document.arcaStatus !== ArcaStatus.EMITIDO) return null;

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
      {isPending && (
        <span className="text-xs text-slate-500">Generando documento…</span>
      )}
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

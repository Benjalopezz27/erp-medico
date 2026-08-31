import { ArcaStatus, type IFiscalDocument } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';

export function FiscalStatusBadge({ document }: { document: IFiscalDocument | null }) {
  if (!document)
    return (
      <Badge variant="outline" className="border-slate-300 text-slate-600">
        Sin factura
      </Badge>
    );
  if (document.arcaStatus === ArcaStatus.EMITIDO) return <Badge variant="success">Emitida</Badge>;
  if (document.arcaStatus === ArcaStatus.PENDIENTE_FACTURACION)
    return <Badge variant="warning">Pendiente</Badge>;
  return <Badge variant="destructive">Rechazada</Badge>;
}

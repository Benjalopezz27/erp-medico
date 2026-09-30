import { DebtorStatus } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';

export function DebtorStatusBadge({ status }: { status: DebtorStatus }) {
  return status === DebtorStatus.MOROSO ? (
    <Badge variant="destructive">Moroso</Badge>
  ) : (
    <Badge variant="success">Al día</Badge>
  );
}

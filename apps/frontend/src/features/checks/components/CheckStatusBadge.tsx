import { CheckStatus } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { CHECK_STATUS_LABELS } from '../utils/check-actions';

const VARIANTS: Record<CheckStatus, 'info' | 'warning' | 'success' | 'secondary' | 'destructive'> =
  {
    [CheckStatus.RECIBIDO]: 'info',
    [CheckStatus.EN_CARTERA]: 'warning',
    [CheckStatus.DEPOSITADO]: 'success',
    [CheckStatus.ENDOSADO]: 'secondary',
    [CheckStatus.RECHAZADO]: 'destructive',
  };

export function CheckStatusBadge({ status }: { status: CheckStatus }) {
  return <Badge variant={VARIANTS[status]}>{CHECK_STATUS_LABELS[status]}</Badge>;
}

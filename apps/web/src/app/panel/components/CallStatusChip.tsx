import type { CallStatus } from '@portfolio/schemas';
import { CALL_STATUS_LABELS, capitalize } from '@/lib/format';

const LOOK: Record<CallStatus, string> = {
  borrador: 'chip-white',
  abierta: 'chip-green',
  cerrada: 'chip-mustard',
  resuelta: 'chip-ink',
};

export function CallStatusChip({ status }: { status: CallStatus }) {
  return <span className={`chip chip-sm ${LOOK[status]}`} style={{ fontWeight: 800 }}>{capitalize(CALL_STATUS_LABELS[status])}</span>;
}

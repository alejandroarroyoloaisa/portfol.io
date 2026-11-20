import Link from 'next/link';
import type { CallSummary } from '@portfolio/schemas';
import { callTypeLabel, capitalize, fmtDate } from '@/lib/format';
import styles from './CallCard.module.css';

const COLORS = [
  { bg: 'var(--c-coral)', fg: 'var(--c-tinta)', tilt: -1 },
  { bg: 'var(--c-mostaza)', fg: 'var(--c-tinta)', tilt: 1.2 },
  { bg: 'var(--c-cobalto)', fg: 'var(--c-crema)', tilt: -0.6 },
  { bg: 'var(--c-blanco)', fg: 'var(--c-tinta)', tilt: 0.8 },
];

export function callMeta(call: CallSummary) {
  return [capitalize(callTypeLabel(call.type)), call.places ? `${call.places} plazas` : null, call.prize, call.city]
    .filter(Boolean)
    .join(' · ');
}

export function closingText(call: Pick<CallSummary, 'closesAt' | 'daysLeft'>) {
  if (call.daysLeft < 0) return `cerró el ${fmtDate(call.closesAt)}`;
  const left = call.daysLeft === 0 ? 'último día' : `quedan ${call.daysLeft} ${call.daysLeft === 1 ? 'día' : 'días'}`;
  return `cierra el ${fmtDate(call.closesAt)} · ${left}`;
}

/** Convocatoria como recorte de color (enlaza a su página pública). */
export function CallCard({ call, index = 0, showOrg = false }: { call: CallSummary; index?: number; showOrg?: boolean }) {
  const c = COLORS[index % COLORS.length];
  return (
    <Link
      href={`/convocatorias/${call.id}`}
      className={styles.card}
      style={{ background: c.bg, color: c.fg, transform: `rotate(${c.tilt}deg)`, boxShadow: c.bg.includes('blanco') ? 'var(--shadow-cut)' : undefined }}
    >
      <span className={`hand ${styles.when}`}>{closingText(call)}</span>
      <span className={styles.title}>{call.title}</span>
      {showOrg && <span className={styles.meta}>{call.organization.name}</span>}
      <span className={styles.meta}>{callMeta(call)}</span>
    </Link>
  );
}

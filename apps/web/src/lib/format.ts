import {
  APPLICATION_STATUS_LABELS, ARTWORK_STATUS_LABELS, CALL_TYPE_LABELS, TECHNIQUE_LABELS, THEME_LABELS,
  type ApplicationStatus, type CallStatus, type CallType, type Technique, type Theme, type ArtworkStatus,
} from '@portfolio/schemas';
import { applicationStatusColors } from '@portfolio/tokens';

const TZ = 'Europe/Madrid';

export const nf = new Intl.NumberFormat('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions);
export const fmtNumber = (n: number) => nf.format(n);

/** «30 de noviembre» (añade el año si no es el actual). */
export function fmtDate(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'long', timeZone: TZ, ...(opts.year || !sameYear ? { year: 'numeric' } : {}),
  }).format(d);
}

/** «30 nov 2026» */
export function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(d);
}

/** Fecha de un hito del calendario de una convocatoria: puede ser ISO («2026-11-30») o texto libre («enero»). */
export function fmtMilestone(s: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? fmtDate(s) : s;
}

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const techniqueLabel = (t: Technique) => TECHNIQUE_LABELS[t] ?? t;
export const themeLabel = (t: Theme) => THEME_LABELS[t] ?? t;
export const callTypeLabel = (t: CallType) => CALL_TYPE_LABELS[t] ?? t;
export const artworkStatusLabel = (s: ArtworkStatus) => ARTWORK_STATUS_LABELS[s] ?? s;
export const applicationStatusLabel = (s: ApplicationStatus) => APPLICATION_STATUS_LABELS[s] ?? s;
export const statusColors = (s: ApplicationStatus) => applicationStatusColors[s] ?? { bg: '#fff', fg: '#141414' };

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  borrador: 'borrador', abierta: 'abierta', cerrada: 'cerrada', resuelta: 'resuelta',
};

/** Etiqueta del botón que lleva una solicitud a cada estado (acciones de la organización). */
export const STATUS_ACTION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  en_revision: 'Pasar a revisión',
  preseleccionada: 'Preseleccionar',
  aceptada: 'Aceptar',
  no_seleccionada: 'Descartar',
};

/** «100 × 81 cm» (alto × ancho, como en las fichas de los museos). */
export const fmtSize = (widthCm: number, heightCm: number) => `${fmtCm(heightCm)} × ${fmtCm(widthCm)} cm`;
const fmtCm = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('es-ES'));

export const fmtBytes = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** Primer nombre («Nora Vidal» → «Nora»). */
export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

/** Plural sencillo. */
export const plural = (n: number, one: string, many: string) => `${fmtNumber(n)} ${n === 1 ? one : many}`;

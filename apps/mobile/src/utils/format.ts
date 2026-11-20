/** Formato de fechas y cifras en español de España, sin depender de Intl (Hermes). */
import { t } from '../i18n';

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Días naturales entre dos fechas (hoy = 0, ayer = 1). */
export function daysBetween(a: Date, b: Date = new Date()) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

/** «1.240», «15.200»: separador de miles con punto también para cuatro cifras, como en el diseño. */
export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  const s = String(Math.abs(Math.round(n)));
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** «+18 %», «−4 %». */
export function formatDelta(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))}\u00A0%`;
}

/** «2,4 MB», «820 KB». */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** «15 dic». */
export function shortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${t.time.monthsShort[d.getMonth()]}`;
}

/** «15 de diciembre». */
export function longDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} de ${t.time.months[d.getMonth()]}`;
}

/** «30.11». */
export function dotDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** «hace 2 h», «ayer», «hace 6 días», «12 nov». */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return t.time.now;
  if (diff < 3_600_000) return t.time.minutesAgo(Math.floor(diff / 60_000));
  const days = daysBetween(d);
  if (days <= 0) return t.time.hoursAgo(Math.floor(diff / 3_600_000));
  if (days === 1) return t.time.yesterday;
  if (days < 7) return t.time.daysAgo(days);
  return shortDate(d);
}

/** Hora de bandeja: «10:31» hoy, «ayer», «lun» esta semana, «12 nov» después. */
export function inboxTime(iso: string): string {
  const d = new Date(iso);
  const days = daysBetween(d);
  if (days <= 0) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (days === 1) return t.time.yesterday;
  if (days < 7) return t.time.weekdaysShort[d.getDay()];
  return shortDate(d);
}

/** Separador de día en la conversación: «hoy», «ayer», «12 nov». */
export function dayLabel(iso: string): string {
  const days = daysBetween(new Date(iso));
  if (days <= 0) return t.time.today;
  if (days === 1) return t.time.yesterday;
  return shortDate(iso);
}

/** Grupo de un aviso: hoy, esta semana o antes. */
export function recencyGroup(iso: string): 'today' | 'week' | 'earlier' {
  const days = daysBetween(new Date(iso));
  if (days <= 0) return 'today';
  if (days < 7) return 'week';
  return 'earlier';
}

/** Las fechas del calendario de una convocatoria pueden ser ISO («2026-12-15») o texto libre («marzo»). */
export function timelineDate(s: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? shortDate(s) : s;
}

export function hoursText(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «Lucía Montero» → «L. Montero». */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
}

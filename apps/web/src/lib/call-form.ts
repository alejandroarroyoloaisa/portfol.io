/**
 * Conversión del formulario de convocatoria (FormData) al cuerpo de la API, validado con el
 * esquema Zod compartido (`createCallSchema` / `updateCallSchema` de @portfolio/schemas).
 * Se usa en el navegador (validación inmediata) y en la Server Action (validación autoritativa).
 */
import { z } from 'zod';
import { createCallSchema, updateCallSchema, type CreateCallInput, type UpdateCallInput } from '@portfolio/schemas';

// Mensajes de Zod en español para los campos sin mensaje propio en el esquema.
z.config(z.locales.es());

export type CallFormErrors = Record<string, string>;

export type ParsedCall<M extends 'create' | 'update'> =
  | { success: true; data: M extends 'create' ? CreateCallInput : UpdateCallInput }
  | { success: false; errors: CallFormErrors };

const text = (fd: FormData, k: string): string | undefined => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
};

const num = (fd: FormData, k: string): number | undefined => {
  const v = text(fd, k);
  return v === undefined ? undefined : Number(v.replace(',', '.'));
};

const list = (fd: FormData, k: string) =>
  fd.getAll(k).filter((v): v is string => typeof v === 'string').map((v) => v.trim());

/** Objeto «crudo» con los tipos que espera la API (antes de validar). */
export function callFormToInput(fd: FormData, mode: 'create' | 'update') {
  const dates = list(fd, 'timelineDate');
  const texts = list(fd, 'timelineText');
  const timeline = dates
    .map((date, i) => ({ date, text: texts[i] ?? '' }))
    .filter((t) => t.date !== '' || t.text !== '');
  // Al editar, un campo opcional vacío se envía como null para poder borrarlo.
  const clearable = (k: string) => num(fd, k) ?? (mode === 'update' ? null : undefined);
  const clearableText = (k: string) => text(fd, k) ?? (mode === 'update' ? '' : undefined);
  return {
    type: text(fd, 'type'),
    title: text(fd, 'title') ?? '',
    summary: clearableText('summary'),
    edition: clearableText('edition'),
    basesUrl: text(fd, 'basesUrl'),
    prize: clearableText('prize'),
    places: num(fd, 'places'),
    closesAt: text(fd, 'closesAt') ?? '',
    timeline,
    requirements: list(fd, 'requirements').filter(Boolean),
    scope: text(fd, 'scope'),
    city: clearableText('city'),
    techniques: list(fd, 'techniques'),
    themes: list(fd, 'themes'),
    maxArtworks: num(fd, 'maxArtworks'),
    maxFormatCm: clearable('maxFormatCm'),
    minYear: clearable('minYear'),
    requiresCv: fd.get('requiresCv') === 'on',
    requiresDossier: fd.get('requiresDossier') === 'on',
    status: text(fd, 'status'),
  };
}

/** Mensajes claros por campo (los del esquema compartido no siempre los tienen). */
const FRIENDLY: Record<string, string> = {
  type: 'Elige el tipo de convocatoria.',
  title: 'El título debe tener entre 3 y 140 caracteres.',
  summary: 'El resumen admite como máximo 400 caracteres.',
  edition: 'La edición admite como máximo 40 caracteres.',
  basesUrl: 'Escribe una dirección web completa, por ejemplo https://…',
  prize: 'La dotación admite como máximo 60 caracteres.',
  places: 'Indica un número entero de plazas entre 1 y 500.',
  closesAt: 'Elige la fecha de cierre de solicitudes.',
  timeline: 'Revisa el calendario: fecha de hasta 20 caracteres y texto de hasta 120 (máximo 10 hitos).',
  requirements: 'Cada requisito admite hasta 160 caracteres (máximo 10).',
  scope: 'Elige el ámbito.',
  city: 'La ciudad admite como máximo 80 caracteres.',
  techniques: 'Selecciona técnicas de la lista.',
  themes: 'Selecciona temas de la lista.',
  maxArtworks: 'Indica entre 1 y 10 obras por solicitud.',
  maxFormatCm: 'Indica el lado máximo en centímetros (número entero hasta 1000).',
  minYear: 'Indica un año entre 1900 y 2100.',
  status: 'Elige un estado.',
};

export function parseCallForm<M extends 'create' | 'update'>(fd: FormData, mode: M): ParsedCall<M> {
  const raw = callFormToInput(fd, mode);
  const schema = mode === 'create' ? createCallSchema : updateCallSchema;
  const r = schema.safeParse(raw);
  if (r.success) return { success: true, data: r.data as M extends 'create' ? CreateCallInput : UpdateCallInput };
  const errors: CallFormErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    // Los errores de filas (timeline.0.text) se agrupan también por lista.
    const group = String(issue.path[0] ?? '_');
    const message = FRIENDLY[group] ?? issue.message;
    errors[key] ??= message;
    errors[group] ??= message;
  }
  return { success: false, errors };
}

/** Límites del esquema que se reflejan como atributos HTML del formulario. */
export const CALL_LIMITS = { title: 140, summary: 400, edition: 40, prize: 60, city: 80, requirement: 160, milestoneDate: 20, milestoneText: 120, rows: 10 } as const;

/** Ciclo de vida de una solicitud (Figura «Diagrama de estados» de la especificación). */

export const APPLICATION_STATUS = [
  'borrador', 'enviada', 'en_revision', 'preseleccionada', 'aceptada', 'no_seleccionada', 'retirada',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  borrador: 'borrador', enviada: 'enviada', en_revision: 'en revisión', preseleccionada: 'preseleccionada',
  aceptada: 'aceptada', no_seleccionada: 'no seleccionada', retirada: 'retirada',
};

/** Quién puede provocar cada transición. */
export type Actor = 'artista' | 'organizacion';

const TRANSITIONS: Record<ApplicationStatus, Partial<Record<ApplicationStatus, Actor>>> = {
  borrador: { enviada: 'artista' },
  enviada: { en_revision: 'organizacion', retirada: 'artista', no_seleccionada: 'organizacion', preseleccionada: 'organizacion' },
  en_revision: { preseleccionada: 'organizacion', no_seleccionada: 'organizacion', retirada: 'artista' },
  preseleccionada: { aceptada: 'organizacion', no_seleccionada: 'organizacion', retirada: 'artista' },
  aceptada: {},
  no_seleccionada: {},
  retirada: {},
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: Actor): boolean {
  return TRANSITIONS[from]?.[to] === actor;
}

export function nextStatuses(from: ApplicationStatus, actor: Actor): ApplicationStatus[] {
  return (Object.entries(TRANSITIONS[from]) as [ApplicationStatus, Actor][])
    .filter(([, a]) => a === actor)
    .map(([s]) => s);
}

export function isFinal(s: ApplicationStatus): boolean {
  return s === 'aceptada' || s === 'no_seleccionada' || s === 'retirada';
}

/** «En curso» para la pantalla Mis solicitudes. */
export function isInProgress(s: ApplicationStatus): boolean {
  return s === 'enviada' || s === 'en_revision' || s === 'preseleccionada';
}

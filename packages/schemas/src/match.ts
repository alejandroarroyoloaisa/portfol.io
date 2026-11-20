/**
 * Algoritmo de encaje artista–convocatoria (Ecuación 1 de la especificación):
 *
 *   E(a,c) = 100 · (0,40·J_téc + 0,25·J_tema + 0,20·P + 0,15·R)
 *
 * Es orientativo y nunca bloquea la solicitud (RN-7).
 */
import { Scope, TECHNIQUE_LABELS, THEME_LABELS, Technique, Theme } from './catalog';

export const MATCH_WEIGHTS = { tecnica: 0.4, tema: 0.25, proximidad: 0.2, requisitos: 0.15 } as const;
/** A partir de este valor se muestra «encaja con tu obra». */
export const MATCH_THRESHOLD = 75;
/** Distancia máxima por ámbito, en km. */
export const SCOPE_MAX_KM: Record<Scope, number | null> = {
  local: 100, regional: 400, nacional: 1000, internacional: null,
};

export interface MatchArtist {
  techniques: string[];
  themes: string[];
  /** Obras del portfolio, para comprobar los requisitos formales. */
  artworks: { widthCm: number; heightCm: number; year: number }[];
  country?: string | null;
}

export interface MatchCall {
  techniques: string[];
  themes: string[];
  scope: Scope;
  country?: string | null;
  /** Lado mayor permitido, en cm. */
  maxFormatCm?: number | null;
  /** Año mínimo de realización de las obras. */
  minYear?: number | null;
  maxArtworks: number;
}

export interface MatchResult {
  score: number;
  matches: boolean;
  parts: { tecnica: number; tema: number; proximidad: number; requisitos: number };
  /** Motivo principal, para la etiqueta «encaja con tu obra: …». */
  reason: string;
}

/** Índice de Jaccard. Vale 1 si la convocatoria no restringe (conjunto vacío). */
export function jaccard(a: string[], b: string[]): number {
  if (b.length === 0) return 1;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 1 : inter / union;
}

/** Proximidad geográfica P = max(0, 1 − d/dmax). */
export function proximity(distanceKm: number | null | undefined, call: MatchCall, artistCountry?: string | null): number {
  if (call.scope === 'internacional') return 1;
  if (call.scope === 'nacional' && artistCountry && call.country && artistCountry === call.country) return 1;
  if (distanceKm == null) return 0.5; // sin ubicación: valor neutro
  const max = SCOPE_MAX_KM[call.scope] ?? 1000;
  return Math.max(0, 1 - distanceKm / max);
}

/** Fracción de requisitos formales que cumple el portfolio. */
export function requirements(artist: MatchArtist, call: MatchCall): number {
  const checks: boolean[] = [];
  const eligible = artist.artworks.filter(
    (w) =>
      (call.maxFormatCm == null || Math.max(w.widthCm, w.heightCm) <= call.maxFormatCm) &&
      (call.minYear == null || w.year >= call.minYear),
  );
  if (call.maxFormatCm != null) {
    checks.push(artist.artworks.some((w) => Math.max(w.widthCm, w.heightCm) <= call.maxFormatCm!));
  }
  if (call.minYear != null) checks.push(artist.artworks.some((w) => w.year >= call.minYear!));
  // Tener al menos una obra elegible para presentar
  checks.push(eligible.length >= 1);
  return checks.filter(Boolean).length / checks.length;
}

export function computeMatch(artist: MatchArtist, call: MatchCall, distanceKm?: number | null): MatchResult {
  const parts = {
    tecnica: jaccard(artist.techniques, call.techniques),
    tema: jaccard(artist.themes, call.themes),
    proximidad: proximity(distanceKm, call, artist.country),
    requisitos: requirements(artist, call),
  };
  const raw =
    MATCH_WEIGHTS.tecnica * parts.tecnica +
    MATCH_WEIGHTS.tema * parts.tema +
    MATCH_WEIGHTS.proximidad * parts.proximidad +
    MATCH_WEIGHTS.requisitos * parts.requisitos;
  const score = Math.round(100 * raw);
  return { score, matches: score >= MATCH_THRESHOLD, parts, reason: matchReason(artist, call, parts) };
}

function matchReason(artist: MatchArtist, call: MatchCall, parts: MatchResult['parts']): string {
  const techs = artist.techniques.filter((t) => call.techniques.length === 0 || call.techniques.includes(t));
  const themes = artist.themes.filter((t) => call.themes.length === 0 || call.themes.includes(t));
  const bits: string[] = [];
  if (themes.length) bits.push(themes.slice(0, 1).map((t) => THEME_LABELS[t as Theme] ?? t).join(''));
  if (techs.length) bits.push(techs.slice(0, 2).map((t) => TECHNIQUE_LABELS[t as Technique] ?? t).join(' y '));
  if (parts.requisitos === 1 && call.maxFormatCm) bits.push(`formato hasta ${call.maxFormatCm} cm`);
  if (bits.length === 0) return parts.proximidad > 0.7 ? 'cerca de ti' : 'convocatoria abierta';
  return bits.join(', ');
}

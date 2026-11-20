/** Filtros de Explorar compartidos entre la pantalla y la hoja modal de Filtros (RF-20). */
import type { Format, SearchInput, Technique } from '@portfolio/schemas';
import { create } from 'zustand';

export type ExploreType = 'obras' | 'artistas' | 'galerias';

export interface ExploreFilters {
  technique: Technique[];
  format: Format | null;
  /** null = cualquier distancia. */
  km: number | null;
  available: boolean;
  acceptsCommissions: boolean;
}

export const EMPTY_FILTERS: ExploreFilters = { technique: [], format: null, km: null, available: false, acceptsCommissions: false };

interface FiltersState {
  q: string;
  type: ExploreType;
  filters: ExploreFilters;
  setQ: (q: string) => void;
  setType: (t: ExploreType) => void;
  setFilters: (f: ExploreFilters) => void;
}

export const useExploreStore = create<FiltersState>((set) => ({
  q: '',
  type: 'obras',
  filters: EMPTY_FILTERS,
  setQ: (q) => set({ q }),
  setType: (type) => set({ type }),
  setFilters: (filters) => set({ filters }),
}));

export const countFilters = (f: ExploreFilters) =>
  f.technique.length + (f.format ? 1 : 0) + (f.km ? 1 : 0) + (f.available ? 1 : 0) + (f.acceptsCommissions ? 1 : 0);

/** Traduce el estado de la pantalla a la consulta GET /search. */
export function toSearchInput(q: string, type: ExploreType, f: ExploreFilters): SearchInput {
  return {
    q: q.trim() || undefined,
    type,
    // Las galerías no tienen técnica ni formato: la API las excluiría si se envían.
    technique: type !== 'galerias' && f.technique.length ? f.technique : undefined,
    format: type === 'obras' && f.format ? [f.format] : undefined,
    km: f.km ?? undefined,
    available: type === 'obras' && f.available ? true : undefined,
    acceptsCommissions: type !== 'galerias' && f.acceptsCommissions ? true : undefined,
    limit: 50,
  };
}

import type { ReportInput, SearchInput } from '@portfolio/schemas';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { qk } from '../keys';

/** Muro con desplazamiento infinito por cursor (RF-17). */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: qk.feed,
    queryFn: ({ pageParam }) => api.feed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Búsqueda de obras, artistas y galerías con filtros (RF-19, RF-20). */
export function useSearch(input: SearchInput, enabled = true) {
  return useQuery({
    queryKey: qk.search(input),
    queryFn: () => api.search(input),
    enabled,
    placeholderData: (p) => p,
  });
}

export function useReport() {
  return useMutation({ mutationFn: (b: ReportInput) => api.reports.create(b) });
}

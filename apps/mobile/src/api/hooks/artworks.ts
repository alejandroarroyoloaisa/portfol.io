import type { Artwork, CreateArtworkInput, UpdateArtworkInput } from '@portfolio/schemas';
import { useMutation, useQuery, type QueryKey } from '@tanstack/react-query';
import { api } from '../client';
import { qk } from '../keys';
import { queryClient } from '../queryClient';

/**
 * Una misma obra aparece en muchas cachés (muro, ficha, búsqueda, perfiles, sala…).
 * Este recorrido sustituye todas sus copias para que «me gusta» y «guardar» sean coherentes en toda la app.
 */
function mapArtworks(data: unknown, id: string, fn: (a: Artwork) => Artwork): unknown {
  if (Array.isArray(data)) {
    let changed = false;
    const out = data.map((x) => {
      const y = mapArtworks(x, id, fn);
      if (y !== x) changed = true;
      return y;
    });
    return changed ? out : data;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (o.id === id && 'likedByMe' in o && 'savedByMe' in o) return fn(o as unknown as Artwork);
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      const y = mapArtworks(v, id, fn);
      if (y !== v) changed = true;
      out[k] = y;
    }
    return changed ? out : data;
  }
  return data;
}

export function patchArtworkEverywhere(id: string, fn: (a: Artwork) => Artwork) {
  const snapshot = queryClient.getQueriesData({});
  queryClient.setQueriesData({}, (old: unknown) => (old === undefined ? old : mapArtworks(old, id, fn)));
  return snapshot as [QueryKey, unknown][];
}

const restore = (snapshot?: [QueryKey, unknown][]) => snapshot?.forEach(([k, v]) => queryClient.setQueryData(k, v));

export function useArtwork(id: string) {
  return useQuery({ queryKey: qk.artwork(id), queryFn: () => api.artworks.get(id), enabled: !!id });
}

/** «Me gusta» optimista (RF-18). */
export function useToggleLike() {
  return useMutation({
    mutationFn: (a: Pick<Artwork, 'id' | 'likedByMe'>) => (a.likedByMe ? api.artworks.unlike(a.id) : api.artworks.like(a.id)),
    onMutate: (a) => ({
      snapshot: patchArtworkEverywhere(a.id, (x) => ({ ...x, likedByMe: !a.likedByMe, likes: Math.max(0, x.likes + (a.likedByMe ? -1 : 1)) })),
    }),
    onError: (_e, _a, ctx) => restore(ctx?.snapshot),
    onSuccess: (r, a) => patchArtworkEverywhere(a.id, (x) => ({ ...x, likes: r.likes })),
  });
}

/** Guardar obra, optimista (RF-18). */
export function useToggleSave() {
  return useMutation({
    mutationFn: (a: Pick<Artwork, 'id' | 'savedByMe'>) => (a.savedByMe ? api.artworks.unsave(a.id) : api.artworks.save(a.id)),
    onMutate: (a) => ({
      snapshot: patchArtworkEverywhere(a.id, (x) => ({ ...x, savedByMe: !a.savedByMe, saves: Math.max(0, x.saves + (a.savedByMe ? -1 : 1)) })),
    }),
    onError: (_e, _a, ctx) => restore(ctx?.snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.saved }),
  });
}

export function useComments(id: string) {
  return useQuery({ queryKey: qk.comments(id), queryFn: () => api.artworks.comments(id) });
}

export function useAddComment(id: string) {
  return useMutation({
    mutationFn: (text: string) => api.artworks.comment(id, text),
    onSuccess: (c) => {
      queryClient.setQueryData(qk.comments(id), (old: typeof c[] | undefined) => [...(old ?? []), c]);
      patchArtworkEverywhere(id, (x) => ({ ...x, comments: x.comments + 1 }));
    },
  });
}

const invalidateMine = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.myArtworks }),
    queryClient.invalidateQueries({ queryKey: qk.mySeries }),
    queryClient.invalidateQueries({ queryKey: qk.me, exact: true }),
    queryClient.invalidateQueries({ queryKey: qk.feed }),
  ]);

export function useCreateArtwork() {
  return useMutation({ mutationFn: (b: CreateArtworkInput) => api.artworks.create(b), onSuccess: invalidateMine });
}

export function useUpdateArtwork(id: string) {
  return useMutation({
    mutationFn: (b: UpdateArtworkInput) => api.artworks.update(id, b),
    onSuccess: (a) => {
      queryClient.setQueryData(qk.artwork(id), a);
      return invalidateMine();
    },
  });
}

export function useDeleteArtwork() {
  return useMutation({
    mutationFn: (id: string) => api.artworks.remove(id),
    onSuccess: (_r, id) => {
      queryClient.removeQueries({ queryKey: qk.artwork(id) });
      return invalidateMine();
    },
  });
}

/** Sala virtual de una serie (RF-21). */
export function useSeriesRoom(seriesId: string | undefined) {
  return useQuery({ queryKey: qk.series(seriesId ?? ''), queryFn: () => api.artworks.series(seriesId!), enabled: !!seriesId });
}

export function useExhibition(id: string | undefined) {
  return useQuery({ queryKey: qk.exhibition(id ?? ''), queryFn: () => api.exhibitions.get(id!), enabled: !!id });
}

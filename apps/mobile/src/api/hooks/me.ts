import type { Me, SettingsInput, StatsPeriod, UpdateMeInput } from '@portfolio/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from '../../store/session';
import { api } from '../client';
import { qk } from '../keys';
import { clearAllCaches, queryClient } from '../queryClient';

export function useMe() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return useQuery({ queryKey: qk.me, queryFn: api.me.get, enabled: signedIn, staleTime: 60_000 });
}

/** Contadores de no leídos y pendientes (GET /me/summary). */
export function useSummary() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return useQuery({ queryKey: qk.summary, queryFn: api.me.summary, enabled: signedIn, staleTime: 10_000 });
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (b: UpdateMeInput) => api.me.update(b),
    onSuccess: (me) => {
      queryClient.setQueryData(qk.me, me);
      void queryClient.invalidateQueries({ queryKey: ['users', me.handle] });
    },
  });
}

/** Ajustes con actualización optimista: el interruptor cambia al momento y vuelve atrás si falla. */
export function useUpdateSettings() {
  return useMutation({
    mutationFn: (b: SettingsInput) => api.me.settings(b),
    onMutate: async (b) => {
      await queryClient.cancelQueries({ queryKey: qk.me, exact: true });
      const prev = queryClient.getQueryData<Me>(qk.me);
      if (prev) {
        queryClient.setQueryData<Me>(qk.me, {
          ...prev,
          settings: {
            ...prev.settings,
            ...b,
            notifications: { ...prev.settings.notifications, ...(b.notifications ?? {}) },
          } as Me['settings'],
        });
      }
      return { prev };
    },
    onError: (_e, _b, ctx) => ctx?.prev && queryClient.setQueryData(qk.me, ctx.prev),
    onSuccess: (me) => queryClient.setQueryData(qk.me, me),
  });
}

export function useMyArtworks() {
  return useQuery({ queryKey: qk.myArtworks, queryFn: () => api.me.artworks({ drafts: true }) });
}

export function useMySeries() {
  return useQuery({ queryKey: qk.mySeries, queryFn: api.me.series });
}

export function useSaved() {
  return useQuery({ queryKey: qk.saved, queryFn: api.me.saved });
}

export function useStats(period: StatsPeriod) {
  return useQuery({ queryKey: qk.stats(period), queryFn: () => api.me.stats(period), placeholderData: (p) => p });
}

export function useExportData() {
  return useMutation({ mutationFn: api.me.export });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await api.me.deleteAccount();
      await clearAllCaches();
      await useSession.getState().setTokens(null);
    },
  });
}

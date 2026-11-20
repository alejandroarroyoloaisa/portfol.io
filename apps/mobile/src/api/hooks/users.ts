import type { NetworkOverview, Technique, UserProfile } from '@portfolio/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { qk } from '../keys';
import { queryClient } from '../queryClient';

export function useUser(handle: string) {
  return useQuery({ queryKey: qk.user(handle), queryFn: () => api.users.get(handle) });
}

export function useUserArtworks(id: string | undefined) {
  return useQuery({ queryKey: qk.userArtworks(id ?? ''), queryFn: () => api.users.artworks(id!), enabled: !!id });
}

export function useUserSeries(id: string | undefined) {
  return useQuery({ queryKey: qk.userSeries(id ?? ''), queryFn: () => api.users.series(id!), enabled: !!id });
}

const patchProfile = (handle: string, fn: (p: UserProfile) => UserProfile) =>
  queryClient.setQueryData<UserProfile>(qk.user(handle), (p) => (p ? fn(p) : p));

/** Seguir / dejar de seguir (RF-14), optimista. */
export function useToggleFollow(profile: Pick<UserProfile, 'id' | 'handle' | 'following'>) {
  return useMutation({
    mutationFn: () => (profile.following ? api.users.unfollow(profile.id) : api.users.follow(profile.id)),
    onMutate: () => {
      const prev = queryClient.getQueryData<UserProfile>(qk.user(profile.handle));
      patchProfile(profile.handle, (p) => ({
        ...p, following: !p.following, counts: { ...p.counts, followers: p.counts.followers + (p.following ? -1 : 1) },
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && queryClient.setQueryData(qk.user(profile.handle), ctx.prev),
  });
}

/** Validar una técnica de otra persona (RF-16). */
export function useEndorse(profile: Pick<UserProfile, 'id' | 'handle'>) {
  return useMutation({
    mutationFn: (technique: Technique) => api.users.endorse(profile.id, technique),
    onSuccess: (_r, technique) =>
      patchProfile(profile.handle, (p) => ({
        ...p,
        endorsedByMe: [...p.endorsedByMe, technique],
        endorsements: { ...p.endorsements, [technique]: (p.endorsements[technique] ?? 0) + 1 },
      })),
  });
}

/** Registra una visita al perfil (estadísticas de la otra persona). */
export function useRecordView() {
  return useMutation({ mutationFn: (id: string) => api.users.view(id) });
}

const refreshNetwork = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.summary }),
    queryClient.invalidateQueries({ queryKey: qk.connections }),
    queryClient.invalidateQueries({ queryKey: ['users'] }),
  ]);

/** Enviar solicitud de conexión (RF-13). */
export function useConnect() {
  return useMutation({
    mutationFn: (user: { id: string; handle?: string }) => api.network.connect(user.id),
    onSuccess: (_r, user) => {
      if (user.handle) patchProfile(user.handle, (p) => ({ ...p, connection: 'pending_out' }));
    },
  });
}

export function useRemoveConnection() {
  return useMutation({
    mutationFn: (user: { id: string; handle: string }) => api.network.remove(user.id),
    onSuccess: (_r, user) => {
      patchProfile(user.handle, (p) => ({ ...p, connection: 'none', counts: { ...p.counts, connections: Math.max(0, p.counts.connections - 1) } }));
      return refreshNetwork();
    },
  });
}

export function useNetwork() {
  return useQuery({ queryKey: qk.network, queryFn: api.network.overview });
}

export function useConnections() {
  return useQuery({ queryKey: qk.connections, queryFn: api.network.list });
}

/** Aceptar o ignorar una solicitud. La tarjeta se queda con su resultado hasta que se refresca la lista. */
export function useAnswerRequest() {
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => (accept ? api.network.accept(id) : api.network.ignore(id)),
    onSuccess: (_r, { accept }) => {
      if (accept) queryClient.setQueryData<NetworkOverview>(qk.network, (n) => (n ? { ...n, total: n.total + 1 } : n));
      return refreshNetwork();
    },
  });
}

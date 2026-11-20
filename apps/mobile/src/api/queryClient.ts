import { ApiRequestError } from '@portfolio/api-client';
import { focusManager, QueryClient, type QueryKey } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { localStore } from '../utils/storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Los 4xx no se reintentan (no van a cambiar); los fallos de red, dos veces.
      retry: (count, e) => !(e instanceof ApiRequestError && e.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

/** En nativo, «foco» = la app vuelve a primer plano (para refrescar contadores y listas). */
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (s) => handleFocus(s === 'active'));
    return () => sub.remove();
  });
}

/* ------------------------------------------------------------------------------------------
 * Caché sin conexión (RNF-12): el perfil propio, el cuaderno, las series y las solicitudes se
 * guardan en AsyncStorage al llegar del servidor y se restauran al arrancar, de modo que se
 * pueden consultar sin red.
 * ---------------------------------------------------------------------------------------- */
const PREFIX = 'portfolio.cache.';
const PERSISTED: QueryKey[] = [['me'], ['me', 'artworks'], ['me', 'series'], ['me', 'applications', 'todas'], ['me', 'summary']];
const keyId = (k: QueryKey) => PREFIX + JSON.stringify(k);
const isPersisted = (k: QueryKey) => PERSISTED.some((p) => JSON.stringify(p) === JSON.stringify(k));

let persisting = false;
export async function setupOfflineCache() {
  await Promise.all(
    PERSISTED.map(async (k) => {
      const saved = await localStore.getJSON<{ data: unknown; at: number }>(keyId(k));
      // Se marca como antigua para que se vuelva a pedir en cuanto haya red.
      if (saved && queryClient.getQueryData(k) === undefined) queryClient.setQueryData(k, saved.data, { updatedAt: 1 });
    }),
  );
  if (persisting) return;
  persisting = true;
  queryClient.getQueryCache().subscribe((ev) => {
    if (ev.type !== 'updated' || ev.action.type !== 'success') return;
    const k = ev.query.queryKey;
    if (isPersisted(k)) void localStore.setJSON(keyId(k), { data: ev.query.state.data, at: Date.now() });
  });
}

/** Al cerrar sesión se vacía todo: caché en memoria y copia local. */
export async function clearAllCaches() {
  queryClient.clear();
  await localStore.clearPrefix(PREFIX);
}

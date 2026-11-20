/** Acceso a la API desde el servidor para las páginas públicas (sin sesión). */
import { cache } from 'react';
import { ApiRequestError, createApiClient } from '@portfolio/api-client';
import { API_URL, PUBLIC_REVALIDATE } from './config';

export { ApiRequestError };

/** Cliente anónimo cuyas respuestas se cachean `revalidate` segundos (ISR). */
export function publicApi(revalidate: number = PUBLIC_REVALIDATE) {
  return createApiClient({
    baseUrl: API_URL,
    fetch: (input, init) => fetch(input, { ...init, next: { revalidate } }),
  });
}

/** Devuelve null si la API responde 404; relanza el resto de errores. */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

/** Devuelve `fallback` ante cualquier error (bloques no esenciales, p. ej. la portada). */
export async function orFallback<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** Perfil público por alias (memorizado por petición: lo usan generateMetadata y la página). */
export const getProfile = cache((handle: string) => orNull(publicApi().users.get(handle.toLowerCase())));
export const getArtworks = cache((userId: string) => publicApi().users.artworks(userId));
export const getSeries = cache((userId: string) => publicApi().users.series(userId));
export const getArtwork = cache((id: string) => orNull(publicApi().artworks.get(id)));
export const getCall = cache((id: string) => orNull(publicApi().calls.get(id)));

/**
 * Sesión del panel en el servidor: lee las cookies HttpOnly y crea el cliente tipado de la API.
 *
 * - Al renderizar (Server Components) no se pueden escribir cookies, así que el cliente solo
 *   lleva el token de acceso: la renovación ya la ha hecho el proxy antes de renderizar.
 * - En Server Actions y Route Handlers el cliente lleva también el refresh token y, si la API
 *   responde 401, renueva y rota las cookies de forma transparente.
 */
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiRequestError, createApiClient, type ApiClient } from '@portfolio/api-client';
import type { Tokens } from '@portfolio/schemas';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, writeAuthCookies } from './auth-cookies';
import { API_URL } from './config';

const noStore: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

export async function readTokens(): Promise<Tokens | null> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value ?? '';
  const refreshToken = jar.get(REFRESH_COOKIE)?.value ?? '';
  if (!accessToken && !refreshToken) return null;
  return { accessToken, refreshToken, expiresIn: 0 };
}

/** Guarda (o borra) los tokens. Solo funciona en Server Actions y Route Handlers. */
export async function writeTokens(t: Tokens | null) {
  const jar = await cookies();
  if (t) writeAuthCookies(jar, t);
  else clearAuthCookies(jar);
}

/** Cliente para renderizar páginas del panel (solo lectura de cookies). */
export const getRenderApi = cache(async (): Promise<ApiClient> => {
  const t = await readTokens();
  return createApiClient({
    baseUrl: API_URL,
    fetch: noStore,
    tokens: { get: () => (t?.accessToken ? { accessToken: t.accessToken, refreshToken: '', expiresIn: 0 } : null), set: () => {} },
  });
});

/** Cliente para Server Actions: renueva y rota las cookies si el token de acceso caducó. */
export async function getActionApi(): Promise<ApiClient> {
  return createApiClient({
    baseUrl: API_URL,
    fetch: noStore,
    tokens: { get: readTokens, set: writeTokens },
  });
}

/** Cliente sin sesión (login). */
export function anonymousApi(): ApiClient {
  return createApiClient({ baseUrl: API_URL, fetch: noStore });
}

/**
 * Ejecuta una llamada a la API al renderizar el panel. Si la sesión ya no es válida (401)
 * vuelve a /acceder; los 404 los convierte en null para que la página llame a notFound().
 */
export async function panelFetch<T>(fn: (api: ApiClient) => Promise<T>, nextPath = '/panel'): Promise<T> {
  const api = await getRenderApi();
  try {
    return await fn(api);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) {
      redirect(`/acceder?caducada=1&next=${encodeURIComponent(nextPath)}`);
    }
    throw e;
  }
}

export async function panelFetchOrNull<T>(fn: (api: ApiClient) => Promise<T>, nextPath?: string): Promise<T | null> {
  try {
    return await panelFetch(fn, nextPath);
  } catch (e) {
    if (e instanceof ApiRequestError && (e.status === 404 || e.status === 400 || e.status === 403)) return null;
    throw e;
  }
}

/** Usuario de la sesión y organización que gestiona (memorizados por petición). */
export const getMe = cache(() => panelFetch((api) => api.me.get()));
export const getDashboard = cache(() => panelFetchOrNull((api) => api.org.dashboard()));

/** Mensaje legible de un error de la API para mostrarlo en un formulario. */
export function apiErrorMessage(e: unknown, fallback = 'No se ha podido completar la acción. Inténtalo de nuevo.'): string {
  if (e instanceof ApiRequestError) {
    if (e.status === 401) return 'Tu sesión ha caducado. Vuelve a entrar.';
    if (e.status === 403) return 'No tienes permiso para gestionar esta convocatoria.';
    if (e.status >= 500) return 'La API ha fallado. Inténtalo de nuevo en unos segundos.';
    return e.message || fallback;
  }
  if (e instanceof TypeError) return 'No hay conexión con la API de Portfol.io.';
  return fallback;
}

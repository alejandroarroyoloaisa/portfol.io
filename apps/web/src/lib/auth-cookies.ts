/**
 * Cookies de sesión de la web (compartido por el proxy y el código de servidor).
 * Los dos tokens viajan en cookies HttpOnly + SameSite=Lax: el JavaScript del navegador
 * nunca los ve (Sección 5 de la especificación: «en la web, en una cookie HttpOnly»).
 */
import type { Tokens } from '@portfolio/schemas';
import { API_URL } from './config';

export const ACCESS_COOKIE = 'pf_at';
export const REFRESH_COOKIE = 'pf_rt';

/** Vida del token de renovación en la API (30 días). */
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
}

const base = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  // Secure en producción; COOKIE_SECURE=false permite probar `next start` por http en otra máquina.
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/',
});

/** Interfaz mínima común a `cookies()` de next/headers y `response.cookies` del proxy. */
export interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown;
}

export function writeAuthCookies(jar: CookieWriter, t: Pick<Tokens, 'accessToken' | 'refreshToken' | 'expiresIn'>) {
  jar.set(ACCESS_COOKIE, t.accessToken, { ...base(), maxAge: Math.max(60, t.expiresIn) });
  jar.set(REFRESH_COOKIE, t.refreshToken, { ...base(), maxAge: REFRESH_MAX_AGE });
}

export function clearAuthCookies(jar: CookieWriter) {
  jar.set(ACCESS_COOKIE, '', { ...base(), maxAge: 0 });
  jar.set(REFRESH_COOKIE, '', { ...base(), maxAge: 0 });
}

/** Lee `exp` de un JWT sin verificar la firma (la verifica la API); null si no se puede leer. */
export function jwtExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** ¿Caduca el token de acceso en menos de `marginMs`? */
export function isExpiring(token: string, marginMs = 30_000): boolean {
  const exp = jwtExpiry(token);
  return exp === null || exp - Date.now() < marginMs;
}

/** Llama a POST /auth/refresh. Devuelve los tokens nuevos o null si la sesión ya no es válida. */
export async function requestRefresh(refreshToken: string): Promise<Tokens | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const t = (await res.json()) as Tokens;
    return { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn };
  } catch {
    return null;
  }
}

/** Ruta interna segura para redirigir tras iniciar sesión (evita redirecciones abiertas). */
export function safeNext(value: unknown, fallback = '/panel'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

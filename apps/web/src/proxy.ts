/**
 * Proxy (antes «middleware») de la zona privada.
 *
 * - Sin sesión → redirige a /acceder?next=<ruta>.
 * - Token de acceso caducado o a punto de caducar → lo renueva con el refresh token,
 *   rota las dos cookies HttpOnly en la respuesta y reescribe la cabecera Cookie de la
 *   petición para que los Server Components de esta misma petición ya vean el token nuevo.
 * - Con sesión válida, /acceder lleva directamente al panel.
 *
 * La API revoca toda la familia de tokens si un refresh token se usa dos veces, así que las
 * peticiones simultáneas (navegación + precargas) comparten una única renovación en curso.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { Tokens } from '@portfolio/schemas';
import {
  ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, isExpiring, requestRefresh, writeAuthCookies,
} from './lib/auth-cookies';

const inflight = new Map<string, { at: number; result: Promise<Tokens | null> }>();
const SHARE_MS = 20_000;

function refreshOnce(refreshToken: string): Promise<Tokens | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > SHARE_MS) inflight.delete(k);
  const hit = inflight.get(refreshToken);
  if (hit) return hit.result;
  const result = requestRefresh(refreshToken);
  inflight.set(refreshToken, { at: now, result });
  return result;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const onLogin = pathname === '/acceder';
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (access && !isExpiring(access)) {
    return onLogin && request.method === 'GET'
      ? NextResponse.redirect(new URL('/panel', request.url))
      : NextResponse.next();
  }

  if (refresh) {
    const tokens = await refreshOnce(refresh);
    if (tokens) {
      request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
      request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
      const response = onLogin && request.method === 'GET'
        ? NextResponse.redirect(new URL('/panel', request.url))
        : NextResponse.next({ request: { headers: request.headers } });
      writeAuthCookies(response.cookies, tokens);
      return response;
    }
  }

  if (onLogin) {
    const response = NextResponse.next();
    if (access || refresh) clearAuthCookies(response.cookies);
    return response;
  }

  const login = new URL('/acceder', request.url);
  login.searchParams.set('next', pathname + search);
  if (refresh) login.searchParams.set('caducada', '1');
  const response = NextResponse.redirect(login);
  clearAuthCookies(response.cookies);
  return response;
}

export const config = {
  matcher: ['/panel/:path*', '/acceder'],
};

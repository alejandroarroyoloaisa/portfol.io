/** Instancia única del cliente tipado de la API, conectada al almacén de sesión. */
import { createApiClient, type TokenStore } from '@portfolio/api-client';
import { API_URL } from '../config';
import { useSession } from '../store/session';

const tokenStore: TokenStore = {
  get: () => useSession.getState().tokens,
  set: (tokens) => useSession.getState().setTokens(tokens),
};

export const api = createApiClient({
  baseUrl: API_URL,
  tokens: tokenStore,
  // El refresh se ha rechazado: el propio cliente ya ha borrado los tokens (estado «signedOut»).
  onSessionExpired: () => undefined,
});

export type Api = typeof api;

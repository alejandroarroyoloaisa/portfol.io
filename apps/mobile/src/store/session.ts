/**
 * Sesión: tokens (en SecureStore, o localStorage en la web) y estado de autenticación.
 * Los datos del perfil propio viven en la caché de TanStack Query (clave ['me']).
 */
import type { Tokens } from '@portfolio/schemas';
import { create } from 'zustand';
import { secureStorage } from '../utils/storage';

const TOKENS_KEY = 'portfolio.tokens';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  tokens: Tokens | null;
  /** Lee los tokens guardados al arrancar. */
  hydrate: () => Promise<void>;
  /** Guarda (o borra, con null) los tokens. Lo usa el cliente de la API al iniciar sesión o renovar. */
  setTokens: (tokens: Tokens | null) => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  tokens: null,
  async hydrate() {
    let tokens: Tokens | null = null;
    try {
      const raw = await secureStorage.get(TOKENS_KEY);
      tokens = raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      tokens = null;
    }
    set({ tokens, status: tokens?.refreshToken ? 'signedIn' : 'signedOut' });
  },
  async setTokens(tokens) {
    set({ tokens, status: tokens ? 'signedIn' : 'signedOut' });
    await secureStorage.set(TOKENS_KEY, tokens ? JSON.stringify(tokens) : null);
  },
}));

/** Acceso síncrono al token de acceso actual (Socket.IO). */
export const getAccessToken = () => useSession.getState().tokens?.accessToken ?? null;

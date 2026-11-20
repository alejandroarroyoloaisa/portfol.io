/**
 * Tiempo real con Socket.IO (espacio /ws). Mantiene una conexión mientras hay sesión y
 * traduce los eventos del servidor a la caché de TanStack Query:
 *  - message:new  → añade el mensaje a la conversación y refresca bandeja y contadores.
 *  - message:read → marca como vistos los mensajes propios.
 *  - typing       → indicador «escribiendo…».
 *  - notification:new → refresca avisos y contadores.
 */
import type { ClientToServerEvents, ServerToClientEvents } from '@portfolio/api-client';
import type { Message, SendMessageInput } from '@portfolio/schemas';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { WS_URL } from '../config';
import { getAccessToken, useSession } from '../store/session';
import { api } from './client';
import { appendMessage, markMessagesRead, refreshInbox } from './hooks/messaging';
import { qk } from './keys';
import { queryClient } from './queryClient';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Quién está escribiendo en cada conversación (se borra solo a los 6 s). */
interface TypingState {
  byConversation: Record<string, string | null>;
  set: (conversationId: string, userId: string | null) => void;
}
export const useTyping = create<TypingState>((set) => ({
  byConversation: {},
  set: (conversationId, userId) => set((s) => ({ byConversation: { ...s.byConversation, [conversationId]: userId } })),
}));

/** Conversación abierta en pantalla: sus mensajes nuevos se marcan como leídos al momento. */
export const activeConversation = { id: null as string | null, onIncoming: null as null | ((m: Message) => void) };

interface Realtime {
  /** Envía por socket con confirmación; si no hay conexión, por REST. */
  send: (conversationId: string, body: SendMessageInput) => Promise<Message>;
  typing: (conversationId: string, typing: boolean) => void;
}

const RealtimeContext = createContext<Realtime | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const signedIn = useSession((s) => s.status === 'signedIn');
  const socketRef = useRef<AppSocket | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!signedIn) return;
    const socket: AppSocket = io(WS_URL, {
      transports: ['websocket'],
      // Función: en cada reconexión se lee el token vigente (se renueva cada 15 min).
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Al reconectar se puede haber perdido algo: se refrescan contadores y bandeja.
      void refreshInbox();
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
    });
    socket.on('disconnect', async (reason) => {
      // El servidor corta la conexión si el token ha caducado: se renueva con una petición autenticada y se reconecta.
      if (reason === 'io server disconnect') {
        try {
          await api.me.summary();
          socket.connect();
        } catch {
          /* sesión caducada: el almacén de sesión ya ha pasado a «signedOut» */
        }
      }
    });
    socket.on('message:new', (m) => {
      appendMessage(m);
      useTyping.getState().set(m.conversationId, null);
      if (activeConversation.id === m.conversationId) activeConversation.onIncoming?.(m);
      void refreshInbox();
    });
    socket.on('message:read', (p) => markMessagesRead(p.conversationId, p.readerId, p.at));
    socket.on('typing', (p) => {
      const { set } = useTyping.getState();
      clearTimeout(typingTimers.current[p.conversationId]);
      set(p.conversationId, p.typing ? p.userId : null);
      if (p.typing) typingTimers.current[p.conversationId] = setTimeout(() => set(p.conversationId, null), 6000);
    });
    socket.on('notification:new', () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications });
      void queryClient.invalidateQueries({ queryKey: qk.summary });
    });

    return () => {
      Object.values(typingTimers.current).forEach(clearTimeout);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [signedIn]);

  const value = useMemo<Realtime>(
    () => ({
      async send(conversationId, body) {
        const s = socketRef.current;
        let message: Message;
        if (s?.connected) {
          message = await new Promise<Message>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), 8000);
            s.emit('message:send', { conversationId, ...body }, (r) => {
              clearTimeout(timer);
              if (r.ok && r.message) resolve(r.message);
              else reject(new Error(r.error ?? 'No se ha podido enviar'));
            });
          }).catch((e: Error) => (e.message === 'timeout' ? api.conversations.send(conversationId, body) : Promise.reject(e)));
        } else {
          message = await api.conversations.send(conversationId, body);
        }
        appendMessage(message);
        void refreshInbox();
        return message;
      },
      typing(conversationId, typing) {
        socketRef.current?.emit('typing', { conversationId, typing });
      },
    }),
    [],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): Realtime {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime fuera de RealtimeProvider');
  return ctx;
}

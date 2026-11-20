import type { Conversation, Message, Notification, SendMessageInput, StartConversationInput } from '@portfolio/schemas';
import { useInfiniteQuery, useMutation, useQuery, type InfiniteData } from '@tanstack/react-query';
import { api } from '../client';
import { qk } from '../keys';
import { queryClient } from '../queryClient';

const PAGE = 50;

export function useConversations(q: string) {
  return useQuery({ queryKey: qk.conversations(q), queryFn: () => api.conversations.list(q || undefined), placeholderData: (p) => p });
}

export function useConversation(id: string) {
  return useQuery({ queryKey: qk.conversation(id), queryFn: () => api.conversations.get(id) });
}

/** Mensajes paginados hacia atrás: la página 0 es la más reciente. */
export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: qk.messages(id),
    queryFn: ({ pageParam }) => api.conversations.messages(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length >= PAGE ? last[0]?.sentAt : undefined),
  });
}

/** Añade un mensaje (del socket o de la respuesta del envío) sin duplicarlo. */
export function appendMessage(m: Message) {
  queryClient.setQueryData<InfiniteData<Message[], string | undefined>>(qk.messages(m.conversationId), (data) => {
    if (!data) return data;
    if (data.pages.some((p) => p.some((x) => x.id === m.id))) return data;
    const [first = [], ...rest] = data.pages;
    return { ...data, pages: [[...first, m], ...rest] };
  });
}

/** Marca como leídos los mensajes de otra persona al recibir «message:read». */
export function markMessagesRead(conversationId: string, readerId: string, at: string) {
  queryClient.setQueryData<InfiniteData<Message[], string | undefined>>(qk.messages(conversationId), (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => p.map((m) => (m.author.id !== readerId && !m.readAt ? { ...m, readAt: at } : m))) }
      : data,
  );
}

export function refreshInbox() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.conversationsAll }),
    queryClient.invalidateQueries({ queryKey: qk.summary }),
  ]);
}

/** Envío por REST (alternativa cuando el socket no está conectado). */
export function useSendMessageRest(conversationId: string) {
  return useMutation({
    mutationFn: (b: SendMessageInput) => api.conversations.send(conversationId, b),
    onSuccess: (m) => {
      appendMessage(m);
      return refreshInbox();
    },
  });
}

export function useMarkConversationRead() {
  return useMutation({
    mutationFn: (id: string) => api.conversations.read(id),
    onSuccess: (_r, id) => {
      queryClient.setQueriesData<Conversation[]>({ queryKey: qk.conversationsAll }, (list) =>
        list?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
      );
      return queryClient.invalidateQueries({ queryKey: qk.summary });
    },
  });
}

/** Abre (o reutiliza) una conversación con alguien (RN-5: la API valida el contexto). */
export function useStartConversation() {
  return useMutation({
    mutationFn: (b: StartConversationInput) => api.conversations.start(b),
    onSuccess: (c) => {
      queryClient.setQueryData(qk.conversation(c.id), c);
      return refreshInbox();
    },
  });
}

export function useQuickReplies() {
  return useQuery({ queryKey: qk.quickReplies, queryFn: api.conversations.quickReplies, staleTime: Infinity });
}

/* -------------------------------- Avisos -------------------------------- */

export function useNotifications() {
  return useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => api.notifications.read(id),
    onMutate: (id) => {
      queryClient.setQueryData<Notification[]>(qk.notifications, (l) => l?.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.summary }),
  });
}

export function useReadAllNotifications() {
  return useMutation({
    mutationFn: api.notifications.readAll,
    onMutate: () => {
      queryClient.setQueryData<Notification[]>(qk.notifications, (l) => l?.map((n) => ({ ...n, read: true })));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.summary }),
  });
}

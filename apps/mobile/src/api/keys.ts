/** Claves de la caché de TanStack Query, agrupadas por dominio. */
import type { SearchInput, StatsPeriod } from '@portfolio/schemas';

export type CallsFilter = { match?: boolean; type?: string };
export type ApplicationsFilter = 'todas' | 'en_curso' | 'resueltas';

export const qk = {
  me: ['me'] as const,
  summary: ['me', 'summary'] as const,
  myArtworks: ['me', 'artworks'] as const,
  mySeries: ['me', 'series'] as const,
  saved: ['me', 'saved'] as const,
  stats: (p: StatsPeriod) => ['me', 'stats', p] as const,
  applications: (f: ApplicationsFilter) => ['me', 'applications', f] as const,
  applicationsAll: ['me', 'applications'] as const,
  application: (id: string) => ['applications', id] as const,

  feed: ['feed'] as const,
  artwork: (id: string) => ['artworks', id] as const,
  comments: (id: string) => ['artworks', id, 'comments'] as const,
  series: (id: string) => ['series', id] as const,
  exhibition: (id: string) => ['exhibitions', id] as const,

  user: (handle: string) => ['users', handle] as const,
  userArtworks: (id: string) => ['users', id, 'artworks'] as const,
  userSeries: (id: string) => ['users', id, 'series'] as const,

  search: (q: SearchInput) => ['search', q] as const,

  network: ['network'] as const,
  connections: ['network', 'list'] as const,

  calls: (f: CallsFilter) => ['calls', f] as const,
  callsAll: ['calls'] as const,
  call: (id: string) => ['call', id] as const,

  conversations: (q?: string) => ['conversations', q ?? ''] as const,
  conversationsAll: ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (id: string) => ['conversation', id, 'messages'] as const,
  quickReplies: ['quickReplies'] as const,

  notifications: ['notifications'] as const,
};

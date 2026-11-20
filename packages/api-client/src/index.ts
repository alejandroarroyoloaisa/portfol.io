/**
 * Cliente tipado de la API REST de Portfol.io (prefijo /api/v1).
 * Gestiona el token de acceso y su renovación rotativa de forma transparente.
 */
import type {
  Application, ApplicationsOverview, Artwork, AuthResponse, CallDetail, CallSummary, Comment, Conversation,
  CreateApplicationInput, CreateArtworkInput, CreateCallInput, Exhibition, FeedItem, LoginInput, Me, Message,
  NetworkOverview, Notification, OnboardingInput, OrgApplicationRow, OrgDashboard, Page, RegisterInput, ReportInput,
  SearchInput, SearchResult, SendMessageInput, SettingsInput, StartConversationInput, Stats, StatsPeriod, Summary,
  Tokens, UpdateApplicationStatusInput, UpdateArtworkInput, UpdateCallInput, UpdateMeInput, UploadResult, UserProfile,
  UserSummary, ApplicationStatus, SeriesSummary,
} from '@portfolio/schemas';

export interface TokenStore {
  get(): Tokens | null | Promise<Tokens | null>;
  set(tokens: Tokens | null): void | Promise<void>;
}

export interface ClientOptions {
  /** URL base de la API, p. ej. http://localhost:3000/api/v1 */
  baseUrl: string;
  tokens?: TokenStore;
  /** Se llama cuando la sesión deja de ser válida (refresh rechazado). */
  onSessionExpired?: () => void;
  fetch?: typeof fetch;
}

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
  }
  /** Errores de validación por campo (ZodError serializado por la API). */
  get fieldErrors(): Record<string, string> {
    const errs = (this.body as { errors?: { path: string; message: string }[] })?.errors ?? [];
    return Object.fromEntries(errs.map((e) => [e.path, e.message]));
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

function qs(q?: Query): string {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function createApiClient(opts: ClientOptions) {
  const f = opts.fetch ?? fetch;
  let refreshing: Promise<boolean> | null = null;

  async function refresh(): Promise<boolean> {
    const current = await opts.tokens?.get();
    if (!current?.refreshToken) return false;
    const res = await f(`${opts.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      await opts.tokens?.set(null);
      opts.onSessionExpired?.();
      return false;
    }
    const t = (await res.json()) as Tokens;
    await opts.tokens?.set({ accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn });
    return true;
  }

  async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const tokens = await opts.tokens?.get();
    const headers: Record<string, string> = { Accept: 'application/json' };
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
    const res = await f(`${opts.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    if (res.status === 401 && retry && tokens?.refreshToken && !path.startsWith('/auth/')) {
      refreshing ??= refresh().finally(() => (refreshing = null));
      if (await refreshing) return request<T>(method, path, body, false);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const msg = (data && (Array.isArray(data.message) ? data.message.join(', ') : data.message)) || res.statusText;
      throw new ApiRequestError(res.status, msg, data);
    }
    return data as T;
  }

  const get = <T>(p: string, q?: Query) => request<T>('GET', p + qs(q));
  const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
  const patch = <T>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {});
  const del = <T>(p: string) => request<T>('DELETE', p);

  async function saveAuth(r: AuthResponse) {
    await opts.tokens?.set({ accessToken: r.accessToken, refreshToken: r.refreshToken, expiresIn: r.expiresIn });
    return r;
  }

  return {
    request,
    auth: {
      register: (b: RegisterInput) => post<AuthResponse>('/auth/register', b).then(saveAuth),
      login: (b: LoginInput) => post<AuthResponse>('/auth/login', b).then(saveAuth),
      oauth: (provider: 'google' | 'apple', idToken: string) =>
        post<AuthResponse>(`/auth/oauth/${provider}`, { idToken }).then(saveAuth),
      forgotPassword: (email: string) => post<{ ok: true }>('/auth/forgot-password', { email }),
      resetPassword: (token: string, password: string) => post<{ ok: true }>('/auth/reset-password', { token, password }),
      async logout() {
        const t = await opts.tokens?.get();
        try { if (t?.refreshToken) await post('/auth/logout', { refreshToken: t.refreshToken }); } finally { await opts.tokens?.set(null); }
      },
    },
    me: {
      get: () => get<Me>('/me'),
      update: (b: UpdateMeInput) => patch<Me>('/me', b),
      onboarding: (b: OnboardingInput) => post<Me>('/me/onboarding', b),
      settings: (b: SettingsInput) => patch<Me>('/me/settings', b),
      summary: () => get<Summary>('/me/summary'),
      stats: (period: StatsPeriod = '30d') => get<Stats>('/me/stats', { period }),
      artworks: (q?: { drafts?: boolean }) => get<Artwork[]>('/me/artworks', q),
      series: () => get<SeriesSummary[]>('/me/series'),
      saved: () => get<Artwork[]>('/me/saved'),
      applications: (q?: { filter?: 'todas' | 'en_curso' | 'resueltas' }) => get<ApplicationsOverview>('/me/applications', q),
      export: () => get<Record<string, unknown>>('/me/export'),
      deleteAccount: () => del<void>('/me'),
      registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') => post<void>('/me/push-tokens', { token, platform }),
    },
    users: {
      get: (handle: string) => get<UserProfile>(`/users/${encodeURIComponent(handle)}`),
      artworks: (id: string, q?: { seriesId?: string }) => get<Artwork[]>(`/users/${id}/artworks`, q),
      series: (id: string) => get<SeriesSummary[]>(`/users/${id}/series`),
      follow: (id: string) => post<void>(`/users/${id}/follow`),
      unfollow: (id: string) => del<void>(`/users/${id}/follow`),
      endorse: (id: string, technique: string) => post<void>(`/users/${id}/endorsements`, { technique }),
      view: (id: string) => post<void>(`/users/${id}/view`),
    },
    artworks: {
      get: (id: string) => get<Artwork>(`/artworks/${id}`),
      create: (b: CreateArtworkInput) => post<Artwork>('/artworks', b),
      update: (id: string, b: UpdateArtworkInput) => patch<Artwork>(`/artworks/${id}`, b),
      remove: (id: string) => del<void>(`/artworks/${id}`),
      like: (id: string) => post<{ likes: number }>(`/artworks/${id}/like`),
      unlike: (id: string) => del<{ likes: number }>(`/artworks/${id}/like`),
      save: (id: string) => post<{ saves: number }>(`/artworks/${id}/save`),
      unsave: (id: string) => del<{ saves: number }>(`/artworks/${id}/save`),
      comments: (id: string) => get<Comment[]>(`/artworks/${id}/comments`),
      comment: (id: string, text: string) => post<Comment>(`/artworks/${id}/comments`, { text }),
      series: (seriesId: string) => get<Exhibition>(`/series/${seriesId}`),
    },
    uploads: {
      /** Sube una imagen o un PDF (campo «file»). Devuelve la clave y, si es imagen, sus variantes. */
      upload: (form: FormData, kind: 'obra' | 'avatar' | 'documento' = 'obra') =>
        request<UploadResult>('POST', `/uploads?kind=${kind}`, form),
    },
    feed: (cursor?: string) => get<Page<FeedItem>>('/feed', { cursor }),
    search: (q: SearchInput) => get<SearchResult>('/search', q as Query),
    network: {
      overview: () => get<NetworkOverview>('/connections'),
      list: () => get<UserSummary[]>('/connections/list'),
      connect: (userId: string) => post<{ id: string }>('/connections', { userId }),
      accept: (id: string) => post<void>(`/connections/${id}/accept`),
      ignore: (id: string) => post<void>(`/connections/${id}/ignore`),
      remove: (userId: string) => del<void>(`/connections/user/${userId}`),
    },
    calls: {
      list: (q?: { match?: boolean; type?: string; q?: string }) => get<CallSummary[]>('/calls', q),
      get: (id: string) => get<CallDetail>(`/calls/${id}`),
      create: (b: CreateCallInput) => post<CallDetail>('/calls', b),
      update: (id: string, b: UpdateCallInput) => patch<CallDetail>(`/calls/${id}`, b),
      apply: (id: string, b: CreateApplicationInput) => post<Application>(`/calls/${id}/applications`, b),
      applications: (id: string, q?: { status?: ApplicationStatus; q?: string }) =>
        get<OrgApplicationRow[]>(`/calls/${id}/applications`, q),
      application: (id: string, aid: string) => get<Application>(`/calls/${id}/applications/${aid}`),
      setStatus: (id: string, aid: string, b: UpdateApplicationStatusInput) =>
        patch<Application>(`/calls/${id}/applications/${aid}`, b),
    },
    applications: {
      get: (id: string) => get<Application>(`/applications/${id}`),
      update: (id: string, b: CreateApplicationInput) => patch<Application>(`/applications/${id}`, b),
      withdraw: (id: string) => post<Application>(`/applications/${id}/withdraw`),
    },
    conversations: {
      list: (q?: string) => get<Conversation[]>('/conversations', { q }),
      start: (b: StartConversationInput) => post<Conversation>('/conversations', b),
      get: (id: string) => get<Conversation>(`/conversations/${id}`),
      messages: (id: string, before?: string) => get<Message[]>(`/conversations/${id}/messages`, { before }),
      send: (id: string, b: SendMessageInput) => post<Message>(`/conversations/${id}/messages`, b),
      read: (id: string) => post<void>(`/conversations/${id}/read`),
      quickReplies: () => get<string[]>('/conversations/quick-replies'),
    },
    notifications: {
      list: () => get<Notification[]>('/notifications'),
      read: (id: string) => patch<void>(`/notifications/${id}`, { read: true }),
      readAll: () => post<void>('/notifications/read-all'),
    },
    exhibitions: { get: (id: string) => get<Exhibition>(`/exhibitions/${id}`) },
    reports: { create: (b: ReportInput) => post<{ id: string }>('/reports', b) },
    org: { dashboard: () => get<OrgDashboard>('/org/dashboard') },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Eventos de tiempo real (Socket.IO, espacio de nombres /ws). */
export interface ServerToClientEvents {
  'message:new': (m: Message) => void;
  'message:read': (p: { conversationId: string; readerId: string; at: string }) => void;
  'typing': (p: { conversationId: string; userId: string; typing: boolean }) => void;
  'notification:new': (n: Notification) => void;
}
export interface ClientToServerEvents {
  'typing': (p: { conversationId: string; typing: boolean }) => void;
  'message:send': (p: { conversationId: string } & SendMessageInput, ack: (r: { ok: boolean; message?: Message; error?: string }) => void) => void;
}

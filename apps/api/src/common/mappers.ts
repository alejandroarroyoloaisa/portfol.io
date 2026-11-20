/** Conversión de entidades Prisma a los DTO del contrato (@portfolio/schemas). */
import { Prisma } from '@prisma/client';
import type {
  Artwork, CallSummary, ImageVariants, Role, Settings, Technique, Theme, UserSummary,
} from '@portfolio/schemas';
import { computeMatch, MatchArtist } from '@portfolio/schemas';
import { config } from '../config';

export const mediaUrl = (path: string) => `${config.publicUrl}/media/${path}`;

export function initials(name: string): string {
  const parts = name.replace(/[«»"']/g, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase();
}

export const userSummarySelect = {
  id: true, handle: true, name: true, role: true, headline: true, city: true, avatarKey: true, verified: true, settings: true,
} satisfies Prisma.UserSelect;
export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export function toUserSummary(u: UserSummaryRow): UserSummary {
  const s = (u.settings ?? {}) as Partial<Settings>;
  return {
    id: u.id,
    handle: u.handle,
    name: u.name,
    role: u.role as Role,
    headline: u.headline,
    // RN-6: solo la ciudad, y solo si la persona lo permite
    city: s.showCity === false ? null : u.city,
    avatarUrl: u.avatarKey ? mediaUrl(`${u.avatarKey}_thumb.webp`) : null,
    initials: initials(u.name),
    verified: u.verified,
  };
}

export function toImage(i: { key: string; width: number; height: number; color: string }): ImageVariants {
  return {
    thumb: mediaUrl(`${i.key}_thumb.webp`),
    medium: mediaUrl(`${i.key}_medium.webp`),
    large: mediaUrl(`${i.key}_large.webp`),
    width: i.width,
    height: i.height,
    color: i.color,
  };
}

export function artworkInclude(viewerId?: string) {
  return {
    artist: { select: userSummarySelect },
    series: { select: { id: true, title: true, _count: { select: { artworks: { where: { draft: false } } } } } },
    images: { orderBy: { order: 'asc' } },
    _count: { select: { likes: true, comments: true, saves: true } },
    likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    saves: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
  } satisfies Prisma.ArtworkInclude;
}
export type ArtworkRow = Prisma.ArtworkGetPayload<{ include: ReturnType<typeof artworkInclude> }>;

export function toArtwork(a: ArtworkRow): Artwork {
  const likes = (a as { likes?: unknown[] }).likes;
  const saves = (a as { saves?: unknown[] }).saves;
  return {
    id: a.id,
    title: a.title,
    artist: toUserSummary(a.artist),
    technique: a.technique as Technique,
    widthCm: a.widthCm,
    heightCm: a.heightCm,
    year: a.year,
    status: a.status,
    note: a.note,
    annotation: a.annotation,
    themes: a.themes as Theme[],
    series: a.series
      ? { id: a.series.id, title: a.series.title, count: a.series._count.artworks, position: a.seriesPosition ?? 1 }
      : null,
    images: a.images.map(toImage),
    likes: a._count.likes,
    comments: a._count.comments,
    saves: a._count.saves,
    views: a.viewsCount,
    likedByMe: Array.isArray(likes) && likes.length > 0,
    savedByMe: Array.isArray(saves) && saves.length > 0,
    draft: a.draft,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export const daysLeft = (d: Date) => Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));

/** Distancia en km entre dos puntos (Haversine). En consultas masivas se usa PostGIS. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const callInclude = { org: { select: userSummarySelect } } satisfies Prisma.CallInclude;
export type CallRow = Prisma.CallGetPayload<{ include: typeof callInclude }>;

export interface MatchContext {
  artist: MatchArtist & { lat: number | null; lng: number | null };
}

export function callMatch(c: CallRow, ctx?: MatchContext) {
  if (!ctx) return null;
  const dist =
    ctx.artist.lat != null && ctx.artist.lng != null && c.lat != null && c.lng != null
      ? haversineKm({ lat: ctx.artist.lat, lng: ctx.artist.lng }, { lat: c.lat, lng: c.lng })
      : null;
  const r = computeMatch(ctx.artist, {
    techniques: c.techniques, themes: c.themes, scope: c.scope, country: c.country,
    maxFormatCm: c.maxFormatCm, minYear: c.minYear, maxArtworks: c.maxArtworks,
  }, dist);
  return { score: r.score, matches: r.matches, reason: r.reason };
}

export function toCallSummary(
  c: CallRow, ctx?: MatchContext, mine?: { id: string; status: string } | null,
): CallSummary {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    organization: toUserSummary(c.org),
    city: c.city,
    prize: c.prize,
    places: c.places,
    closesAt: c.closesAt.toISOString(),
    daysLeft: daysLeft(c.closesAt),
    status: c.status,
    match: callMatch(c, ctx),
    myApplication: mine ? { id: mine.id, status: mine.status as never } : null,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  notifications: { mensajes: true, convocatorias: true, red: true, solicitudes: true, actividad: false },
  privateProfile: false,
  showCity: true,
  watermark: false,
  allowMessagesFrom: 'todos',
};
export function settingsOf(json: unknown): Settings {
  const s = (json ?? {}) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...s, notifications: { ...DEFAULT_SETTINGS.notifications, ...(s.notifications ?? {}) } };
}

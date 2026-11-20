import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SearchResult, Technique } from '@portfolio/schemas';
import { searchSchema } from '@portfolio/schemas';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { artworkInclude, toArtwork, toUserSummary, userSummarySelect } from '../common/mappers';

type Q = z.output<typeof searchSchema>;

/**
 * RF-19 y RF-20: búsqueda de obras, artistas y galerías.
 * Texto completo en español (tsvector) para obras; trigramas para nombres; distancia con PostGIS (ST_DWithin).
 */
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(viewerId: string | undefined, q: Q): Promise<SearchResult> {
    const me = viewerId
      ? await this.prisma.user.findUnique({ where: { id: viewerId }, select: { lat: true, lng: true } })
      : null;
    const origin = me?.lat != null && me?.lng != null ? Prisma.sql`ST_SetSRID(ST_MakePoint(${me.lng}, ${me.lat}), 4326)::geography` : null;
    const text = q.q?.trim();
    const like = text ? `%${text}%` : null;
    const wantArtworks = q.type === 'todo' || q.type === 'obras';
    const wantArtists = q.type === 'todo' || q.type === 'artistas';
    const wantGalleries = q.type === 'todo' || q.type === 'galerias';
    const kmFilter = (alias: string) =>
      origin && q.km ? Prisma.sql`AND ST_DWithin(${Prisma.raw(alias)}."location", ${origin}, ${q.km * 1000})` : Prisma.empty;
    const dist = (alias: string) =>
      origin ? Prisma.sql`ST_Distance(${Prisma.raw(alias)}."location", ${origin}) / 1000` : Prisma.sql`NULL::float`;

    const result: SearchResult = { artworks: [], artists: [], galleries: [], total: 0, nextCursor: null };
    // Paginación por desplazamiento cuando se busca un único tipo
    const offset = q.type !== 'todo' && q.cursor && /^\d+$/.test(q.cursor) ? Number(q.cursor) : 0;
    const take = q.limit + 1;

    if (wantArtworks) {
      const formats = q.format?.length
        ? Prisma.sql`AND (${Prisma.join(
            q.format.map((f) =>
              f === 'pequeno' ? Prisma.sql`GREATEST(a."widthCm", a."heightCm") < 50`
              : f === 'mediano' ? Prisma.sql`GREATEST(a."widthCm", a."heightCm") BETWEEN 50 AND 120`
              : Prisma.sql`GREATEST(a."widthCm", a."heightCm") > 120`),
            ' OR ',
          )})`
        : Prisma.empty;
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT a.id FROM "Artwork" a JOIN "User" u ON u.id = a."artistId"
        WHERE a.draft = false
        ${text ? Prisma.sql`AND (a.search @@ plainto_tsquery('spanish', ${text}) OR a.title ILIKE ${like} OR u.name ILIKE ${like}
             OR EXISTS (SELECT 1 FROM unnest(a.themes) t WHERE ${like} ILIKE '%' || t || '%' OR t ILIKE ${like})
             OR a.technique ILIKE ${like})` : Prisma.empty}
        ${q.technique?.length ? Prisma.sql`AND a.technique IN (${Prisma.join(q.technique)})` : Prisma.empty}
        ${formats}
        ${q.available ? Prisma.sql`AND a.status = 'exposicion'` : Prisma.empty}
        ${q.acceptsCommissions ? Prisma.sql`AND u."acceptsCommissions" = true` : Prisma.empty}
        ${q.openToCalls ? Prisma.sql`AND u."openToCalls" = true` : Prisma.empty}
        ${kmFilter('u')}
        ORDER BY ${text ? Prisma.sql`ts_rank(a.search, plainto_tsquery('spanish', ${text})) DESC,` : Prisma.empty} a."publishedAt" DESC NULLS LAST, a.id
        LIMIT ${take} OFFSET ${offset}`;
      if (q.type === 'obras' && rows.length > q.limit) { rows.pop(); result.nextCursor = String(offset + q.limit); }
      const arts = await this.prisma.artwork.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: artworkInclude(viewerId) });
      result.artworks = rows.map((r) => toArtwork(arts.find((a) => a.id === r.id)!));
    }

    if (wantArtists) {
      const rows = await this.prisma.$queryRaw<{ id: string; km: number | null }[]>`
        SELECT u.id, ${dist('u')} AS km FROM "User" u
        WHERE u.role = 'artista' ${viewerId ? Prisma.sql`AND u.id <> ${viewerId}::uuid` : Prisma.empty}
        ${text ? Prisma.sql`AND (u.name ILIKE ${like} OR u.headline ILIKE ${like} OR u.city ILIKE ${like} OR similarity(u.name, ${text}) > 0.3)` : Prisma.empty}
        ${q.technique?.length ? Prisma.sql`AND u.techniques && ARRAY[${Prisma.join(q.technique)}]::text[]` : Prisma.empty}
        ${q.acceptsCommissions ? Prisma.sql`AND u."acceptsCommissions" = true` : Prisma.empty}
        ${q.openToCalls ? Prisma.sql`AND u."openToCalls" = true` : Prisma.empty}
        ${kmFilter('u')}
        ORDER BY ${origin ? Prisma.sql`km ASC NULLS LAST,` : Prisma.empty} u.name ASC, u.id
        LIMIT ${take} OFFSET ${offset}`;
      if (q.type === 'artistas' && rows.length > q.limit) { rows.pop(); result.nextCursor = String(offset + q.limit); }
      const users = await this.prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.id) } }, select: { ...userSummarySelect, acceptsCommissions: true, techniques: true },
      });
      result.artists = rows.map((r) => {
        const u = users.find((x) => x.id === r.id)!;
        return {
          ...toUserSummary(u), distanceKm: r.km == null ? null : Math.round(r.km),
          acceptsCommissions: u.acceptsCommissions, techniques: u.techniques as Technique[],
        };
      });
    }

    if (wantGalleries && !q.technique?.length && !q.format?.length) {
      const rows = await this.prisma.$queryRaw<{ id: string; km: number | null }[]>`
        SELECT u.id, ${dist('u')} AS km FROM "User" u
        WHERE u.role IN ('galeria', 'institucion')
        ${text ? Prisma.sql`AND (u.name ILIKE ${like} OR u.headline ILIKE ${like} OR u.city ILIKE ${like} OR similarity(u.name, ${text}) > 0.3)` : Prisma.empty}
        ${kmFilter('u')}
        ORDER BY ${origin ? Prisma.sql`km ASC NULLS LAST,` : Prisma.empty} u.name ASC, u.id
        LIMIT ${take} OFFSET ${offset}`;
      if (q.type === 'galerias' && rows.length > q.limit) { rows.pop(); result.nextCursor = String(offset + q.limit); }
      const users = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: userSummarySelect });
      result.galleries = rows.map((r) => ({ ...toUserSummary(users.find((x) => x.id === r.id)!), distanceKm: r.km == null ? null : Math.round(r.km) }));
    }

    if (q.type === 'todo') {
      result.artworks = result.artworks.slice(0, q.limit);
      result.artists = result.artists.slice(0, q.limit);
      result.galleries = result.galleries.slice(0, q.limit);
    }
    result.total = result.artworks.length + result.artists.length + result.galleries.length;
    return result;
  }
}

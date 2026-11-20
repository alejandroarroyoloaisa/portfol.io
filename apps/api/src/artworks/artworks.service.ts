import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Artwork, Comment, CreateArtworkInput, Exhibition, UpdateArtworkInput } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { artworkInclude, toArtwork, toUserSummary, userSummarySelect } from '../common/mappers';
import { NotificationsService } from '../notifications/notifications.service';

function parseImageKey(k: string, order: number) {
  const [key, w, h, color] = k.split('|');
  if (!/^img\/[0-9a-f-]{36}$/.test(key)) throw new ForbiddenException('Imagen no válida');
  return { key, width: Number(w) || 1000, height: Number(h) || 1000, color: color || '#E8DCC4', order };
}

@Injectable()
export class ArtworksService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async get(id: string, viewerId?: string): Promise<Artwork> {
    const a = await this.prisma.artwork.findUnique({ where: { id }, include: artworkInclude(viewerId) });
    if (!a || (a.draft && a.artistId !== viewerId)) throw new NotFoundException('Obra no encontrada');
    if (viewerId !== a.artistId) {
      await this.prisma.$transaction([
        this.prisma.artworkView.create({ data: { artworkId: id, viewerId } }),
        this.prisma.artwork.update({ where: { id }, data: { viewsCount: { increment: 1 } } }),
      ]);
      a.viewsCount++;
    }
    return toArtwork(a);
  }

  private async resolveSeries(artistId: string, dto: UpdateArtworkInput) {
    if (dto.newSeriesTitle) {
      const s = await this.prisma.series.create({ data: { artistId, title: dto.newSeriesTitle } });
      return s.id;
    }
    if (dto.seriesId) {
      const s = await this.prisma.series.findUnique({ where: { id: dto.seriesId } });
      if (!s || s.artistId !== artistId) throw new ForbiddenException('Serie no válida');
      return s.id;
    }
    return dto.seriesId === null ? null : undefined;
  }

  async create(artistId: string, dto: CreateArtworkInput): Promise<Artwork> {
    const seriesId = await this.resolveSeries(artistId, dto);
    const position = seriesId ? (await this.prisma.artwork.count({ where: { seriesId } })) + 1 : null;
    const draft = dto.draft ?? false;
    const a = await this.prisma.artwork.create({
      data: {
        artistId,
        title: dto.title,
        technique: dto.technique,
        widthCm: dto.widthCm,
        heightCm: dto.heightCm,
        year: dto.year,
        status: dto.status,
        note: dto.note || null,
        annotation: dto.annotation || null,
        themes: dto.themes ?? [],
        seriesId: seriesId ?? null,
        seriesPosition: position,
        draft,
        publishedAt: draft ? null : new Date(),
        images: { create: (dto.imageKeys ?? []).map(parseImageKey) },
      },
      include: artworkInclude(artistId),
    });
    return toArtwork(a);
  }

  private async own(id: string, userId: string) {
    const a = await this.prisma.artwork.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Obra no encontrada');
    if (a.artistId !== userId) throw new ForbiddenException('Solo la autora puede modificar la obra');
    return a;
  }

  async update(id: string, userId: string, dto: UpdateArtworkInput): Promise<Artwork> {
    const cur = await this.own(id, userId);
    const seriesId = await this.resolveSeries(userId, dto);
    const { imageKeys, newSeriesTitle: _n, seriesId: _s, draft, ...rest } = dto;
    const data: Prisma.ArtworkUncheckedUpdateInput = { ...rest };
    if (seriesId !== undefined) {
      data.seriesId = seriesId;
      data.seriesPosition = seriesId ? (await this.prisma.artwork.count({ where: { seriesId } })) + 1 : null;
    }
    if (draft !== undefined) {
      data.draft = draft;
      if (!draft && !cur.publishedAt) data.publishedAt = new Date();
    }
    if (imageKeys) {
      await this.prisma.artworkImage.deleteMany({ where: { artworkId: id } });
      data.images = undefined;
      await this.prisma.artworkImage.createMany({ data: imageKeys.map((k, i) => ({ ...parseImageKey(k, i), artworkId: id })) });
    }
    const a = await this.prisma.artwork.update({ where: { id }, data, include: artworkInclude(userId) });
    return toArtwork(a);
  }

  async remove(id: string, userId: string) {
    await this.own(id, userId);
    await this.prisma.artwork.delete({ where: { id } });
  }

  async like(id: string, userId: string) {
    const a = await this.prisma.artwork.findUnique({ where: { id }, select: { artistId: true, title: true } });
    if (!a) throw new NotFoundException();
    await this.prisma.like.upsert({ where: { userId_artworkId: { userId, artworkId: id } }, create: { userId, artworkId: id }, update: {} });
    const likes = await this.prisma.like.count({ where: { artworkId: id } });
    if (likes % 10 === 0) {
      await this.notifications.notify({
        userId: a.artistId, type: 'valoraciones', text: `Tu obra «${a.title}» ha recibido ${likes} valoraciones`, link: `artwork:${id}`,
      });
    }
    return { likes };
  }

  async unlike(id: string, userId: string) {
    await this.prisma.like.deleteMany({ where: { userId, artworkId: id } });
    return { likes: await this.prisma.like.count({ where: { artworkId: id } }) };
  }

  async save(id: string, userId: string) {
    await this.prisma.save.upsert({ where: { userId_artworkId: { userId, artworkId: id } }, create: { userId, artworkId: id }, update: {} });
    return { saves: await this.prisma.save.count({ where: { artworkId: id } }) };
  }

  async unsave(id: string, userId: string) {
    await this.prisma.save.deleteMany({ where: { userId, artworkId: id } });
    return { saves: await this.prisma.save.count({ where: { artworkId: id } }) };
  }

  async comments(id: string): Promise<Comment[]> {
    const rows = await this.prisma.comment.findMany({
      where: { artworkId: id }, orderBy: { createdAt: 'asc' }, include: { author: { select: userSummarySelect } },
    });
    return rows.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt.toISOString(), author: toUserSummary(c.author) }));
  }

  async comment(id: string, userId: string, text: string): Promise<Comment> {
    const a = await this.prisma.artwork.findUnique({ where: { id }, select: { artistId: true, title: true } });
    if (!a) throw new NotFoundException();
    const c = await this.prisma.comment.create({ data: { artworkId: id, authorId: userId, text }, include: { author: { select: userSummarySelect } } });
    await this.notifications.notify({
      userId: a.artistId, actorId: userId, type: 'comentario', text: `${c.author.name} ha comentado «${a.title}»`, link: `artwork:${id}`,
    });
    return { id: c.id, text: c.text, createdAt: c.createdAt.toISOString(), author: toUserSummary(c.author) };
  }

  /** RF-21: una serie se recorre como sala virtual. */
  async seriesExhibition(seriesId: string, viewerId?: string): Promise<Exhibition> {
    const s = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        artist: { select: userSummarySelect },
        artworks: { where: { draft: false }, orderBy: { seriesPosition: 'asc' }, include: artworkInclude(viewerId) },
        exhibitions: { take: 1, orderBy: { startsAt: 'desc' }, include: { org: { select: userSummarySelect } } },
      },
    });
    if (!s) throw new NotFoundException('Serie no encontrada');
    const expo = s.exhibitions[0];
    return {
      id: s.id, title: s.title, artist: toUserSummary(s.artist),
      organization: expo?.org ? toUserSummary(expo.org) : null,
      startsAt: expo?.startsAt?.toISOString() ?? null, endsAt: expo?.endsAt?.toISOString() ?? null,
      virtual: true, artworks: s.artworks.map(toArtwork),
    };
  }

  async exhibition(id: string, viewerId?: string): Promise<Exhibition> {
    const e = await this.prisma.exhibition.findUnique({
      where: { id },
      include: {
        artist: { select: userSummarySelect }, org: { select: userSummarySelect },
        artworks: { orderBy: { order: 'asc' }, include: { artwork: { include: artworkInclude(viewerId) } } },
      },
    });
    if (!e) throw new NotFoundException('Exposición no encontrada');
    return {
      id: e.id, title: e.title, artist: toUserSummary(e.artist), organization: e.org ? toUserSummary(e.org) : null,
      startsAt: e.startsAt?.toISOString() ?? null, endsAt: e.endsAt?.toISOString() ?? null, virtual: e.virtual,
      artworks: e.artworks.map((x) => toArtwork(x.artwork)),
    };
  }
}

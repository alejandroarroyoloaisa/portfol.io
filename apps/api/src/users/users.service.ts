import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CareerItem, ConnectionState, Me, OnboardingInput, OrganizationInfo, Role, SettingsInput, Stats, StatsPeriod,
  Summary, Technique, Theme, UpdateMeInput, UserProfile,
} from '@portfolio/schemas';
import { isInProgress, ORG_ROLES, TECHNIQUES } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import {
  artworkInclude, callInclude, settingsOf, toArtwork, toCallSummary, toImage, toUserSummary, userSummarySelect,
} from '../common/mappers';
import { config } from '../config';
import { NotificationsService } from '../notifications/notifications.service';

const ROLE_ORDER: Role[] = ['artista', 'galeria', 'coleccionista', 'institucion'];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async connectionState(viewerId: string | undefined, userId: string): Promise<ConnectionState> {
    if (!viewerId) return 'none';
    if (viewerId === userId) return 'self';
    const c = await this.prisma.connection.findFirst({
      where: { OR: [{ requesterId: viewerId, receiverId: userId }, { requesterId: userId, receiverId: viewerId }] },
    });
    if (!c || c.status === 'ignorada') return c?.requesterId === viewerId && c.status === 'ignorada' ? 'pending_out' : 'none';
    if (c.status === 'aceptada') return 'connected';
    return c.requesterId === viewerId ? 'pending_out' : 'pending_in';
  }

  async profileById(id: string, viewerId?: string): Promise<UserProfile> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        representedBy: { include: { org: { select: { name: true } } } },
        _count: {
          select: {
            artworks: { where: { draft: false } },
            followers: true,
            exhibitions: true,
            hostedExpos: true,
          },
        },
      },
    });
    if (!u) throw new NotFoundException('Perfil no encontrado');
    const settings = settingsOf(u.settings);
    if (settings.privateProfile && viewerId !== id) {
      const state = await this.connectionState(viewerId, id);
      if (state !== 'connected') throw new ForbiddenException('Este perfil es privado');
    }
    const [connections, endorsements, mine, following] = await Promise.all([
      this.prisma.connection.count({ where: { status: 'aceptada', OR: [{ requesterId: id }, { receiverId: id }] } }),
      this.prisma.endorsement.groupBy({ by: ['technique'], where: { userId: id }, _count: { _all: true } }),
      viewerId ? this.prisma.endorsement.findMany({ where: { userId: id, endorserId: viewerId }, select: { technique: true } }) : [],
      viewerId ? this.prisma.follow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: id } } }) : null,
    ]);
    const isOrg = ORG_ROLES.includes(u.role);
    return {
      ...toUserSummary(u),
      bio: u.bio,
      techniques: u.techniques as Technique[],
      themes: u.themes as Theme[],
      acceptsCommissions: u.acceptsCommissions,
      openToCalls: u.openToCalls,
      representedBy: u.representedBy[0]?.org.name ?? null,
      career: (u.career as unknown as CareerItem[]) ?? [],
      counts: {
        artworks: u._count.artworks,
        connections,
        exhibitions: isOrg ? u._count.hostedExpos : u._count.exhibitions,
        followers: u._count.followers,
      },
      connection: await this.connectionState(viewerId, id),
      following: !!following,
      endorsements: Object.fromEntries(endorsements.map((e) => [e.technique, e._count._all])),
      endorsedByMe: mine.map((m) => m.technique as Technique),
      publicUrl: `${config.webUrl}/${u.handle}`,
      organization: isOrg ? await this.organizationInfo(u.id, u, viewerId) : undefined,
    };
  }

  private async organizationInfo(
    orgId: string, u: { since: number | null; address: string | null; openingHours: string | null }, viewerId?: string,
  ): Promise<OrganizationInfo> {
    const [artists, total, calls, expo] = await Promise.all([
      this.prisma.orgArtist.findMany({ where: { orgId }, take: 6, include: { artist: { select: userSummarySelect } } }),
      this.prisma.orgArtist.count({ where: { orgId } }),
      this.prisma.call.findMany({
        where: { orgId, status: 'abierta', closesAt: { gte: new Date() } }, include: callInclude, orderBy: { closesAt: 'asc' },
      }),
      this.prisma.exhibition.findFirst({
        where: { orgId, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        orderBy: { startsAt: 'desc' },
        include: {
          artist: { select: userSummarySelect }, org: { select: userSummarySelect },
          artworks: { take: 1, orderBy: { order: 'asc' }, include: { artwork: { include: { images: { take: 1, orderBy: { order: 'asc' } } } } } },
        },
      }),
    ]);
    const ctx = viewerId ? await this.matchContext(viewerId) : undefined;
    return {
      since: u.since,
      address: u.address,
      openingHours: u.openingHours,
      artists: artists.map((a) => toUserSummary(a.artist)),
      artistsTotal: total,
      openCalls: calls.map((c) => toCallSummary(c, ctx)),
      currentExhibition: expo
        ? {
            id: expo.id, title: expo.title, virtual: expo.virtual,
            artist: toUserSummary(expo.artist), organization: expo.org ? toUserSummary(expo.org) : null,
            startsAt: expo.startsAt?.toISOString() ?? null, endsAt: expo.endsAt?.toISOString() ?? null,
            cover: expo.artworks[0]?.artwork.images[0] ? toImage(expo.artworks[0].artwork.images[0]) : null,
          }
        : null,
    };
  }

  /** Datos de la artista que alimentan el algoritmo de encaje. */
  async matchContext(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true, techniques: true, themes: true, lat: true, lng: true, country: true,
        artworks: { where: { draft: false }, select: { widthCm: true, heightCm: true, year: true } },
      },
    });
    if (!u || u.role !== 'artista') return undefined;
    return { artist: { techniques: u.techniques, themes: u.themes, artworks: u.artworks, country: u.country, lat: u.lat, lng: u.lng } };
  }

  async profileByHandle(handle: string, viewerId?: string) {
    const u = await this.prisma.user.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true } });
    if (!u) {
      // también se admite el id
      if (/^[0-9a-f-]{36}$/.test(handle)) return this.profileById(handle, viewerId);
      throw new NotFoundException('Perfil no encontrado');
    }
    return this.profileById(u.id, viewerId);
  }

  async me(userId: string): Promise<Me> {
    const [profile, u, member] = await Promise.all([
      this.profileById(userId, userId),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.orgMember.findFirst({ where: { userId }, select: { orgId: true } }),
    ]);
    const checks = [
      !!u.avatarKey, !!u.headline, !!u.bio, !!u.city, u.techniques.length > 0, u.themes.length > 0,
      (u.career as unknown[]).length > 0, profile.counts.artworks >= 3,
    ];
    return {
      ...profile,
      email: u.email ?? '',
      onboarded: u.onboarded,
      location: u.city && u.lat != null && u.lng != null ? { city: u.city, lat: u.lat, lng: u.lng, country: u.country ?? 'ES' } : null,
      settings: settingsOf(u.settings),
      completion: Math.round((100 * checks.filter(Boolean).length) / checks.length),
      orgId: member?.orgId ?? (ORG_ROLES.includes(u.role) ? u.id : null),
    };
  }

  async update(userId: string, dto: UpdateMeInput): Promise<Me> {
    if (dto.handle) {
      const taken = await this.prisma.user.findFirst({ where: { handle: dto.handle, NOT: { id: userId } } });
      if (taken) throw new ConflictException('Ese nombre de usuario ya está en uso');
    }
    const { location, career, avatarKey, representedBy: _r, ...rest } = dto;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        // La subida devuelve «clave|ancho|alto|color»; solo se guarda la clave
        ...(avatarKey !== undefined ? { avatarKey: avatarKey?.split('|')[0] ?? null } : {}),
        ...(career ? { career: career as unknown as Prisma.InputJsonValue } : {}),
        ...(location ? { city: location.city, lat: location.lat, lng: location.lng, country: location.country } : {}),
      },
    });
    return this.me(userId);
  }

  async onboarding(userId: string, dto: OnboardingInput): Promise<Me> {
    const { location, role, ...rest } = dto;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(role ? { role } : {}),
        onboarded: true,
        ...(location ? { city: location.city, lat: location.lat, lng: location.lng, country: location.country } : {}),
      },
    });
    return this.me(userId);
  }

  async settings(userId: string, dto: SettingsInput): Promise<Me> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { settings: true } });
    const cur = settingsOf(u.settings);
    const next = { ...cur, ...dto, notifications: { ...cur.notifications, ...(dto.notifications ?? {}) } };
    await this.prisma.user.update({ where: { id: userId }, data: { settings: next as unknown as Prisma.InputJsonValue } });
    return this.me(userId);
  }

  async summary(userId: string): Promise<Summary> {
    const ctx = await this.matchContext(userId);
    const [convs, unreadNotifications, apps, calls, pendingConnections] = await Promise.all([
      this.prisma.participant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
      this.prisma.application.findMany({ where: { artistId: userId }, select: { status: true } }),
      this.prisma.call.findMany({ where: { status: 'abierta', closesAt: { gte: new Date() } }, include: callInclude }),
      this.prisma.connection.count({ where: { receiverId: userId, status: 'pendiente' } }),
    ]);
    let unreadMessages = 0;
    for (const c of convs) {
      unreadMessages += await this.prisma.message.count({
        where: { conversationId: c.conversationId, authorId: { not: userId }, ...(c.lastReadAt ? { sentAt: { gt: c.lastReadAt } } : {}) },
      });
    }
    return {
      unreadMessages,
      unreadNotifications,
      applicationsInProgress: apps.filter((a) => isInProgress(a.status)).length,
      openCalls: calls.length,
      matchingCalls: ctx ? calls.filter((c) => toCallSummary(c, ctx).match?.matches).length : 0,
      pendingConnections,
    };
  }

  /** RF-32: estadísticas por periodo. */
  async stats(userId: string, period: StatsPeriod): Promise<Stats> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const now = Date.now();
    const from = new Date(now - days * 86_400_000);
    const prevFrom = new Date(now - 2 * days * 86_400_000);
    const [visits, prevVisits, views, saves, contacts, byRole, viewRows, top] = await Promise.all([
      this.prisma.profileView.findMany({ where: { userId, createdAt: { gte: from } }, select: { createdAt: true } }),
      this.prisma.profileView.count({ where: { userId, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.artworkView.count({ where: { artwork: { artistId: userId }, createdAt: { gte: from } } }),
      this.prisma.save.count({ where: { artwork: { artistId: userId }, createdAt: { gte: from } } }),
      this.prisma.connection.count({ where: { receiverId: userId, createdAt: { gte: from } } }).then(async (n) =>
        n + (await this.prisma.conversation.count({
          where: { createdAt: { gte: from }, participants: { some: { userId } }, messages: { some: { authorId: { not: userId } } } },
        })),
      ),
      this.prisma.profileView.groupBy({ by: ['viewerRole'], where: { userId, createdAt: { gte: from } }, _count: { _all: true } }),
      this.prisma.artworkView.groupBy({
        by: ['artworkId'], where: { artwork: { artistId: userId }, createdAt: { gte: from } }, _count: { _all: true },
        orderBy: { _count: { artworkId: 'desc' } }, take: 3,
      }),
      this.prisma.artwork.findMany({
        where: { artistId: userId, draft: false }, orderBy: { viewsCount: 'desc' }, take: 3, include: { images: { take: 1 } },
      }),
    ]);
    // Barras: 7 días, 6 tramos de 5 días o 13 semanas
    const buckets = period === '7d' ? 7 : period === '30d' ? 6 : 13;
    const size = (days * 86_400_000) / buckets;
    const series = Array.from({ length: buckets }, (_, i) => {
      const start = from.getTime() + i * size;
      const d = new Date(start);
      const label = period === '7d' ? 'DLMXJVS'[d.getDay()] : period === '30d' ? `${d.getDate()}/${d.getMonth() + 1}` : `S${i + 1}`;
      return { label, value: visits.filter((v) => v.createdAt.getTime() >= start && v.createdAt.getTime() < start + size).length };
    });
    const totalRole = byRole.reduce((s, r) => s + r._count._all, 0) || 1;
    const audience = ROLE_ORDER.map((role) => ({
      role,
      pct: Math.round((100 * (byRole.find((r) => r.viewerRole === role)?._count._all ?? 0)) / totalRole),
    }));
    let topArtworks: Stats['topArtworks'];
    if (viewRows.length) {
      const arts = await this.prisma.artwork.findMany({ where: { id: { in: viewRows.map((r) => r.artworkId) } }, include: { images: { take: 1 } } });
      topArtworks = viewRows.map((r) => {
        const a = arts.find((x) => x.id === r.artworkId)!;
        return { id: a.id, title: a.title, views: r._count._all, image: a.images[0] ? toImage(a.images[0]) : null };
      });
    } else {
      topArtworks = top.map((a) => ({ id: a.id, title: a.title, views: a.viewsCount, image: a.images[0] ? toImage(a.images[0]) : null }));
    }
    return {
      period,
      visits: visits.length,
      visitsDelta: prevVisits ? Math.round((100 * (visits.length - prevVisits)) / prevVisits) : visits.length ? 100 : 0,
      views, saves, contacts, series, audience, topArtworks,
    };
  }

  async recordView(userId: string, viewer?: { id: string; role: Role }) {
    if (viewer?.id === userId) return;
    await this.prisma.profileView.create({ data: { userId, viewerId: viewer?.id, viewerRole: viewer?.role } });
    if (viewer && ORG_ROLES.includes(viewer.role)) {
      const v = await this.prisma.user.findUnique({ where: { id: viewer.id }, select: { name: true, handle: true } });
      // Limitar a un aviso por organización y día
      const since = new Date(Date.now() - 86_400_000);
      const dup = await this.prisma.notification.findFirst({ where: { userId, actorId: viewer.id, type: 'visita_perfil', createdAt: { gte: since } } });
      if (v && !dup) {
        await this.notifications.notify({ userId, actorId: viewer.id, type: 'visita_perfil', text: `${v.name} ha visto tu perfil`, link: `user:${v.handle}` });
      }
    }
  }

  async artworks(userId: string, viewerId?: string, opts: { drafts?: boolean; seriesId?: string } = {}) {
    const rows = await this.prisma.artwork.findMany({
      where: {
        artistId: userId,
        ...(opts.drafts && viewerId === userId ? {} : { draft: false }),
        ...(opts.seriesId ? { seriesId: opts.seriesId } : {}),
      },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      include: artworkInclude(viewerId),
    });
    return rows.map(toArtwork);
  }

  async series(userId: string) {
    const rows = await this.prisma.series.findMany({
      where: { artistId: userId },
      include: { _count: { select: { artworks: { where: { draft: false } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((s) => ({ id: s.id, title: s.title, count: s._count.artworks }));
  }

  async saved(userId: string) {
    const rows = await this.prisma.save.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, include: { artwork: { include: artworkInclude(userId) } },
    });
    return rows.map((r) => toArtwork(r.artwork));
  }

  async follow(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('No puedes seguirte');
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException();
    await this.prisma.follow.upsert({
      where: { followerId_followeeId: { followerId: userId, followeeId: targetId } },
      create: { followerId: userId, followeeId: targetId }, update: {},
    });
  }

  async unfollow(userId: string, targetId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId: userId, followeeId: targetId } });
  }

  /** RF-16: validar la técnica de otro profesional. */
  async endorse(userId: string, targetId: string, technique: string) {
    if (!TECHNIQUES.includes(technique as Technique)) throw new BadRequestException('Técnica no válida');
    if (userId === targetId) throw new BadRequestException('No puedes validar tu propia técnica');
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { techniques: true } });
    if (!target?.techniques.includes(technique)) throw new BadRequestException('Esa persona no declara esa técnica');
    await this.prisma.endorsement.upsert({
      where: { endorserId_userId_technique: { endorserId: userId, userId: targetId, technique } },
      create: { endorserId: userId, userId: targetId, technique }, update: {},
    });
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, handle: true } });
    await this.notifications.notify({
      userId: targetId, actorId: userId, type: 'validacion_tecnica',
      text: `${me.name} ha validado tu técnica ${technique.replace('_', ' ')}`, link: `user:${me.handle}`,
    });
  }

  /** RF-34: portabilidad de datos (RGPD art. 20). */
  async export(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        series: true, artworks: { include: { images: true } }, applications: { include: { artworks: true } },
        comments: true, likes: true, saves: true, following: true, sentRequests: true, receivedReqs: true,
        messages: true, notifications: true,
      },
    });
    const { passwordHash: _ph, ...data } = user;
    return { exportedAt: new Date().toISOString(), format: 'portfol.io/export@1', user: data };
  }

  /** RF-34: supresión de la cuenta. Las relaciones se eliminan en cascada. */
  async remove(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}

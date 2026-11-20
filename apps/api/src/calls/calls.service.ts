import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CallDetail, CallSummary, CreateCallInput, OrgDashboard, Technique, Theme, UpdateCallInput } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { callInclude, CallRow, toCallSummary, toUserSummary, userSummarySelect } from '../common/mappers';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertManages, orgOf } from './org.util';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService, private users: UsersService, private notifications: NotificationsService) {}

  private async mine(viewerId: string | undefined, callIds: string[]) {
    if (!viewerId) return new Map<string, { id: string; status: string }>();
    const apps = await this.prisma.application.findMany({
      where: { artistId: viewerId, callId: { in: callIds } }, select: { id: true, status: true, callId: true },
    });
    return new Map(apps.map((a) => [a.callId, a]));
  }

  /** RF-22: convocatorias abiertas con indicador de encaje; con match=true se ordenan por encaje. */
  async list(viewerId: string | undefined, q: { match?: boolean; type?: string; q?: string }): Promise<CallSummary[]> {
    const rows = await this.prisma.call.findMany({
      where: {
        status: 'abierta',
        closesAt: { gte: new Date() },
        ...(q.type ? { type: q.type as never } : {}),
        ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { org: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
      },
      include: callInclude,
      orderBy: { closesAt: 'asc' },
    });
    const ctx = viewerId ? await this.users.matchContext(viewerId) : undefined;
    const mine = await this.mine(viewerId, rows.map((r) => r.id));
    const list = rows.map((c) => toCallSummary(c, ctx, mine.get(c.id)));
    if (q.match) list.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    return list;
  }

  async detail(c: CallRow, viewerId?: string): Promise<CallDetail> {
    const ctx = viewerId ? await this.users.matchContext(viewerId) : undefined;
    const mine = await this.mine(viewerId, [c.id]);
    return {
      ...toCallSummary(c, ctx, mine.get(c.id)),
      summary: c.summary, edition: c.edition, basesUrl: c.basesUrl, scope: c.scope,
      techniques: c.techniques as Technique[], themes: c.themes as Theme[],
      maxArtworks: c.maxArtworks, maxFormatCm: c.maxFormatCm, minYear: c.minYear,
      requiresCv: c.requiresCv, requiresDossier: c.requiresDossier, requirements: c.requirements,
      timeline: (c.timeline as { date: string; text: string }[]) ?? [],
      applicationsCount: await this.prisma.application.count({ where: { callId: c.id, status: { not: 'borrador' } } }),
    };
  }

  async get(id: string, viewerId?: string) {
    const c = await this.prisma.call.findUnique({ where: { id }, include: callInclude });
    if (!c) throw new NotFoundException('Convocatoria no encontrada');
    return this.detail(c, viewerId);
  }

  /** RF-26 / RN-2: solo organizaciones verificadas publican convocatorias. */
  async create(userId: string, dto: CreateCallInput): Promise<CallDetail> {
    const orgId = await orgOf(this.prisma, userId);
    if (!orgId) throw new ForbiddenException('Solo galerías e instituciones pueden publicar convocatorias');
    const org = await this.prisma.user.findUniqueOrThrow({ where: { id: orgId } });
    if (!org.verified) throw new ForbiddenException('La organización debe estar verificada para publicar convocatorias');
    const c = await this.prisma.call.create({
      data: {
        ...dto,
        orgId,
        closesAt: new Date(dto.closesAt),
        timeline: (dto.timeline ?? []) as Prisma.InputJsonValue,
        city: dto.city ?? org.city,
        country: org.country,
        lat: org.lat,
        lng: org.lng,
      },
      include: callInclude,
    });
    if (c.status === 'abierta') await this.notifyMatches(c);
    return this.detail(c, userId);
  }

  async update(id: string, userId: string, dto: UpdateCallInput): Promise<CallDetail> {
    const cur = await this.prisma.call.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException();
    await assertManages(this.prisma, userId, cur.orgId);
    const c = await this.prisma.call.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.closesAt ? { closesAt: new Date(dto.closesAt) } : {}),
        ...(dto.timeline ? { timeline: dto.timeline as Prisma.InputJsonValue } : {}),
      },
      include: callInclude,
    });
    if (cur.status !== 'abierta' && c.status === 'abierta') await this.notifyMatches(c);
    return this.detail(c, userId);
  }

  /** Avisa a las artistas con encaje alto (en producción, en un worker de la cola). */
  private async notifyMatches(c: CallRow) {
    const artists = await this.prisma.user.findMany({ where: { role: 'artista', openToCalls: true }, select: { id: true }, take: 500 });
    for (const a of artists) {
      const ctx = await this.users.matchContext(a.id);
      const m = toCallSummary(c, ctx).match;
      if (m?.matches) {
        await this.notifications.notify({
          userId: a.id, type: 'convocatoria_encaje',
          text: `Nueva convocatoria que encaja contigo: ${c.title}${c.prize ? ` · ${c.prize}` : ''}`, link: `call:${c.id}`,
        });
      }
    }
  }

  async dashboard(userId: string): Promise<OrgDashboard> {
    const orgId = await orgOf(this.prisma, userId);
    if (!orgId) throw new ForbiddenException('No gestionas ninguna organización');
    const org = await this.prisma.user.findUniqueOrThrow({ where: { id: orgId }, select: userSummarySelect });
    const calls = await this.prisma.call.findMany({ where: { orgId }, include: callInclude, orderBy: { closesAt: 'desc' } });
    const groups = await this.prisma.application.groupBy({
      by: ['callId', 'status'], where: { callId: { in: calls.map((c) => c.id) }, status: { not: 'borrador' } }, _count: { _all: true },
    });
    return {
      organization: toUserSummary(org),
      calls: calls.map((c) => {
        const g = groups.filter((x) => x.callId === c.id);
        return {
          ...toCallSummary(c),
          applicationsCount: g.reduce((s, x) => s + x._count._all, 0),
          byStatus: Object.fromEntries(g.map((x) => [x.status, x._count._all])),
        };
      }),
    };
  }
}

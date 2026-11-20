import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { NetworkOverview, UserSummary } from '@portfolio/schemas';
import { ORG_ROLES, ROLE_LABELS, TECHNIQUE_LABELS, Technique } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { toUserSummary, userSummarySelect } from '../common/mappers';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async connectionIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.connection.findMany({
      where: { status: 'aceptada', OR: [{ requesterId: userId }, { receiverId: userId }] },
      select: { requesterId: true, receiverId: true },
    });
    return rows.map((r) => (r.requesterId === userId ? r.receiverId : r.requesterId));
  }

  async overview(userId: string): Promise<NetworkOverview> {
    const ids = await this.connectionIds(userId);
    const [pros, reqs] = await Promise.all([
      this.prisma.user.count({ where: { id: { in: ids }, role: { in: ['galeria', 'institucion'] } } }),
      this.prisma.connection.findMany({
        where: { receiverId: userId, status: 'pendiente' }, orderBy: { createdAt: 'desc' },
        include: { requester: { select: userSummarySelect } },
      }),
    ]);
    const mine = new Set(ids);
    const requests = await Promise.all(
      reqs.map(async (r) => {
        const theirs = await this.connectionIds(r.requesterId);
        return { id: r.id, user: toUserSummary(r.requester), mutual: theirs.filter((x) => mine.has(x)).length, createdAt: r.createdAt.toISOString() };
      }),
    );
    return { total: ids.length, professionals: pros, requests, suggestions: await this.suggestions(userId, 6) };
  }

  /** RF-15: sugerencias por contactos en común, técnicas compartidas y cercanía. */
  async suggestions(userId: string, limit: number): Promise<(UserSummary & { reason: string })[]> {
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { techniques: true, city: true } });
    if (!me) return [];
    const ids = await this.connectionIds(userId);
    const related = await this.prisma.connection.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }] }, select: { requesterId: true, receiverId: true },
    });
    const exclude = new Set([userId, ...related.flatMap((r) => [r.requesterId, r.receiverId])]);
    // Contactos de mis contactos
    const second = ids.length
      ? await this.prisma.connection.findMany({
          where: { status: 'aceptada', OR: [{ requesterId: { in: ids } }, { receiverId: { in: ids } }] },
          select: { requesterId: true, receiverId: true },
        })
      : [];
    const mutual = new Map<string, number>();
    for (const c of second) {
      for (const x of [c.requesterId, c.receiverId]) if (!exclude.has(x)) mutual.set(x, (mutual.get(x) ?? 0) + 1);
    }
    const candidates = await this.prisma.user.findMany({
      where: { id: { notIn: [...exclude] }, role: { not: 'admin' } },
      select: { ...userSummarySelect, techniques: true },
      take: 60,
    });
    const scored = candidates.map((u) => {
      const shared = u.techniques.filter((t) => me.techniques.includes(t));
      const m = mutual.get(u.id) ?? 0;
      const sameCity = !!me.city && u.city === me.city;
      const score = m * 3 + shared.length * 2 + (sameCity ? 1 : 0) + (ORG_ROLES.includes(u.role) ? 1 : 0);
      const reason = m > 0 ? `${m} contacto${m > 1 ? 's' : ''} en común`
        : shared.length ? `también trabaja ${TECHNIQUE_LABELS[shared[0] as Technique] ?? shared[0]}`
        : sameCity ? `en ${u.city}` : ROLE_LABELS[u.role].toLowerCase();
      return { u, score, reason };
    });
    scored.sort((a, b) => b.score - a.score || a.u.name.localeCompare(b.u.name));
    return scored.slice(0, limit).map((s) => ({ ...toUserSummary(s.u), reason: s.reason }));
  }

  async list(userId: string) {
    const ids = await this.connectionIds(userId);
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: userSummarySelect, orderBy: { name: 'asc' } });
    return users.map(toUserSummary);
  }

  /** RF-13 / RN-1: la conexión es mutua y requiere aceptación. */
  async connect(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('No puedes conectar contigo');
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    const reverse = await this.prisma.connection.findUnique({ where: { requesterId_receiverId: { requesterId: targetId, receiverId: userId } } });
    if (reverse && reverse.status !== 'aceptada') {
      // Si la otra persona ya lo había pedido, se acepta directamente
      await this.accept(userId, reverse.id);
      return { id: reverse.id };
    }
    if (reverse) return { id: reverse.id };
    const c = await this.prisma.connection.upsert({
      where: { requesterId_receiverId: { requesterId: userId, receiverId: targetId } },
      create: { requesterId: userId, receiverId: targetId }, update: {},
    });
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, handle: true } });
    await this.notifications.notify({
      userId: targetId, actorId: userId, type: 'conexion_solicitada', text: `${me.name} quiere conectar contigo`, link: 'network',
    });
    return { id: c.id };
  }

  async accept(userId: string, id: string) {
    const c = await this.prisma.connection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    if (c.receiverId !== userId) throw new ForbiddenException();
    await this.prisma.connection.update({ where: { id }, data: { status: 'aceptada', respondedAt: new Date() } });
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, handle: true } });
    await this.notifications.notify({
      userId: c.requesterId, actorId: userId, type: 'conexion_aceptada',
      text: `${me.name} aceptó tu solicitud de conexión`, link: `user:${me.handle}`,
    });
  }

  async ignore(userId: string, id: string) {
    const c = await this.prisma.connection.findUnique({ where: { id } });
    if (!c || c.receiverId !== userId) throw new ForbiddenException();
    await this.prisma.connection.update({ where: { id }, data: { status: 'ignorada', respondedAt: new Date() } });
  }

  async remove(userId: string, otherId: string) {
    await this.prisma.connection.deleteMany({
      where: { OR: [{ requesterId: userId, receiverId: otherId }, { requesterId: otherId, receiverId: userId }] },
    });
  }

  async areConnected(a: string, b: string) {
    return !!(await this.prisma.connection.findFirst({
      where: { status: 'aceptada', OR: [{ requesterId: a, receiverId: b }, { requesterId: b, receiverId: a }] },
    }));
  }
}

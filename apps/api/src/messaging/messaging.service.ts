import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Conversation, Message, SendMessageInput, StartConversationInput } from '@portfolio/schemas';
import { ORG_ROLES } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { artworkInclude, settingsOf, toArtwork, toUserSummary, userSummarySelect } from '../common/mappers';
import { NetworkService } from '../network/network.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../notifications/realtime.service';

const QUICK_REPLIES = [
  '¡Gracias por escribir!',
  '¿Te viene bien una llamada esta semana?',
  'Te envío el dossier actualizado.',
  '¿Podemos ver la obra en el taller?',
];

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService, private network: NetworkService, private notifications: NotificationsService, private rt: RealtimeService,
  ) {}

  private async toConversation(convId: string, userId: string): Promise<Conversation> {
    const c = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: convId },
      include: {
        participants: { include: { user: { select: userSummarySelect } } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        call: { select: { id: true, title: true } },
      },
    });
    const me = c.participants.find((p) => p.userId === userId);
    const other = c.participants.find((p) => p.userId !== userId) ?? me!;
    const unread = await this.prisma.message.count({
      where: { conversationId: convId, authorId: { not: userId }, ...(me?.lastReadAt ? { sentAt: { gt: me.lastReadAt } } : {}) },
    });
    const last = c.messages[0];
    return {
      id: c.id,
      other: toUserSummary(other.user),
      lastMessage: last ? { text: last.text || '📎 obra adjunta', sentAt: last.sentAt.toISOString(), mine: last.authorId === userId } : null,
      unread,
      context: c.call ? { callId: c.call.id, title: c.call.title } : null,
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  /** RF-29: bandeja con búsqueda por nombre o contenido. */
  async list(userId: string, q?: string): Promise<Conversation[]> {
    const convs = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        messages: { some: {} },
        ...(q
          ? {
              OR: [
                { participants: { some: { userId: { not: userId }, user: { name: { contains: q, mode: 'insensitive' } } } } },
                { messages: { some: { text: { contains: q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(convs.map((c) => this.toConversation(c.id, userId)));
  }

  async get(id: string, userId: string) {
    await this.assertParticipant(id, userId);
    return this.toConversation(id, userId);
  }

  /** RN-5: sin conexión mutua hace falta un contexto (candidatura, convocatoria u organización). */
  async start(userId: string, dto: StartConversationInput): Promise<Conversation> {
    if (dto.userId === userId) throw new ForbiddenException('No puedes escribirte a ti misma');
    const other = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { role: true, settings: true } });
    if (!other) throw new NotFoundException('Usuario no encontrado');
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
    const connected = await this.network.areConnected(userId, dto.userId);
    let hasContext = !!dto.callId || !!dto.applicationId;
    if (dto.applicationId) {
      const app = await this.prisma.application.findUnique({ where: { id: dto.applicationId }, include: { call: true } });
      hasContext = !!app && [app.artistId, app.call.orgId].includes(userId) && [app.artistId, app.call.orgId].includes(dto.userId);
    }
    const orgContext = ORG_ROLES.includes(other.role) || ORG_ROLES.includes(me.role);
    const onlyConnections = settingsOf(other.settings).allowMessagesFrom === 'conexiones';
    const allowed = connected || hasContext || (orgContext && !onlyConnections);
    if (!allowed) {
      throw new ForbiddenException('Para escribir a esta persona necesitáis estar conectadas o tener una candidatura o convocatoria en común');
    }
    // Reutilizar la conversación existente entre ambas (con el mismo contexto de convocatoria)
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: dto.userId } } }],
        ...(dto.callId ? { callId: dto.callId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    const conv = existing ?? (await this.prisma.conversation.create({
      data: {
        callId: dto.callId, applicationId: dto.applicationId,
        participants: { create: [{ userId, lastReadAt: new Date() }, { userId: dto.userId }] },
      },
    }));
    if (dto.text || dto.artworkId) await this.send(conv.id, userId, { text: dto.text ?? '', artworkId: dto.artworkId });
    return this.toConversation(conv.id, userId);
  }

  async assertParticipant(convId: string, userId: string) {
    const p = await this.prisma.participant.findUnique({ where: { conversationId_userId: { conversationId: convId, userId } } });
    if (!p) throw new ForbiddenException('No participas en esta conversación');
  }

  private messageInclude(viewerId?: string) {
    return { author: { select: userSummarySelect }, artwork: { include: artworkInclude(viewerId) } } as const;
  }

  private toMessage(m: { id: string; conversationId: string; text: string; sentAt: Date; readAt: Date | null; author: Parameters<typeof toUserSummary>[0]; artwork: Parameters<typeof toArtwork>[0] | null }): Message {
    return {
      id: m.id, conversationId: m.conversationId, text: m.text, author: toUserSummary(m.author),
      artwork: m.artwork ? toArtwork(m.artwork) : null, sentAt: m.sentAt.toISOString(), readAt: m.readAt?.toISOString() ?? null,
    };
  }

  async messages(convId: string, userId: string, before?: string): Promise<Message[]> {
    await this.assertParticipant(convId, userId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId: convId, ...(before ? { sentAt: { lt: new Date(before) } } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: this.messageInclude(userId),
    });
    return rows.reverse().map((m) => this.toMessage(m));
  }

  /** RF-30: envío (REST o WebSocket); se emite en vivo a todos los participantes. */
  async send(convId: string, userId: string, dto: SendMessageInput): Promise<Message> {
    await this.assertParticipant(convId, userId);
    if (dto.artworkId) {
      const a = await this.prisma.artwork.findUnique({ where: { id: dto.artworkId }, select: { draft: true, artistId: true } });
      if (!a || (a.draft && a.artistId !== userId)) throw new NotFoundException('Obra no encontrada');
    }
    const m = await this.prisma.message.create({
      data: { conversationId: convId, authorId: userId, text: dto.text ?? '', artworkId: dto.artworkId },
      include: this.messageInclude(),
    });
    await this.prisma.conversation.update({ where: { id: convId }, data: { updatedAt: m.sentAt } });
    await this.prisma.participant.update({ where: { conversationId_userId: { conversationId: convId, userId } }, data: { lastReadAt: m.sentAt } });
    const dto2 = this.toMessage(m);
    const parts = await this.prisma.participant.findMany({ where: { conversationId: convId } });
    for (const p of parts) {
      this.rt.toUser(p.userId, 'message:new', dto2);
      if (p.userId !== userId) {
        await this.notifications.notify({
          userId: p.userId, actorId: userId, type: 'mensaje',
          text: `${m.author.name}: ${dto2.text || 'te ha enviado una obra'}`.slice(0, 140), link: `conversation:${convId}`,
        });
      }
    }
    return dto2;
  }

  async read(convId: string, userId: string) {
    await this.assertParticipant(convId, userId);
    const now = new Date();
    await this.prisma.participant.update({ where: { conversationId_userId: { conversationId: convId, userId } }, data: { lastReadAt: now } });
    await this.prisma.message.updateMany({ where: { conversationId: convId, authorId: { not: userId }, readAt: null }, data: { readAt: now } });
    const parts = await this.prisma.participant.findMany({ where: { conversationId: convId, userId: { not: userId } } });
    for (const p of parts) this.rt.toUser(p.userId, 'message:read', { conversationId: convId, readerId: userId, at: now.toISOString() });
  }

  quickReplies() {
    return QUICK_REPLIES;
  }
}

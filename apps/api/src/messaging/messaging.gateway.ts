import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { sendMessageSchema } from '@portfolio/schemas';
import { config } from '../config';
import { RealtimeService } from '../notifications/realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from './messaging.service';

/** Tiempo real (Socket.IO). El cliente se autentica con el token de acceso en handshake.auth.token. */
@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection {
  private log = new Logger('WS');
  constructor(private jwt: JwtService, private rt: RealtimeService, private svc: MessagingService, private prisma: PrismaService) {}

  // Con namespace, afterInit recibe el Namespace (no el Server raíz)
  afterInit(ns: Namespace) {
    this.rt.ns = ns;
  }

  handleConnection(socket: Socket) {
    try {
      const token = (socket.handshake.auth?.token as string) ?? String(socket.handshake.query.token ?? '');
      const p = this.jwt.verify<{ sub: string }>(token, { secret: config.jwtSecret });
      socket.data.userId = p.sub;
      socket.join(`user:${p.sub}`);
    } catch {
      socket.emit('error', { message: 'No autenticado' });
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() s: Socket, @MessageBody() p: { conversationId: string; typing: boolean }) {
    const userId = s.data.userId as string;
    const parts = await this.prisma.participant.findMany({ where: { conversationId: p.conversationId } });
    if (!parts.some((x) => x.userId === userId)) return;
    for (const x of parts) if (x.userId !== userId) this.rt.toUser(x.userId, 'typing', { conversationId: p.conversationId, userId, typing: !!p.typing });
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() s: Socket, @MessageBody() p: { conversationId: string; text?: string; artworkId?: string }) {
    const parsed = sendMessageSchema.safeParse({ text: p.text ?? '', artworkId: p.artworkId });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
    try {
      const message = await this.svc.send(p.conversationId, s.data.userId, parsed.data);
      return { ok: true, message };
    } catch (e) {
      this.log.debug((e as Error).message);
      return { ok: false, error: (e as Error).message };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { Notification, NotificationPref, NotificationType } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { settingsOf, toUserSummary, userSummarySelect } from '../common/mappers';
import { RealtimeService } from './realtime.service';

const PREF_OF: Record<NotificationType, NotificationPref> = {
  convocatoria_encaje: 'convocatorias', conexion_solicitada: 'red', conexion_aceptada: 'red', visita_perfil: 'actividad',
  valoraciones: 'actividad', validacion_tecnica: 'red', expo_abierta: 'actividad', solicitud_estado: 'solicitudes',
  mensaje: 'mensajes', comentario: 'actividad',
};

@Injectable()
export class NotificationsService {
  private log = new Logger('Avisos');
  constructor(private prisma: PrismaService, private rt: RealtimeService) {}

  /**
   * Crea un aviso en la app (siempre) y lo envía como push si la preferencia está activa (RF-31).
   * Los mensajes no generan aviso en la lista, solo push.
   */
  async notify(p: { userId: string; type: NotificationType; text: string; link?: string; actorId?: string; data?: object }) {
    if (p.actorId === p.userId) return;
    const user = await this.prisma.user.findUnique({ where: { id: p.userId }, select: { settings: true } });
    if (!user) return;
    const wantsPush = settingsOf(user.settings).notifications[PREF_OF[p.type]];
    if (p.type !== 'mensaje') {
      const n = await this.prisma.notification.create({
        data: { userId: p.userId, type: p.type, text: p.text, link: p.link, actorId: p.actorId, data: p.data ?? {} },
        include: { actor: { select: userSummarySelect } },
      });
      this.rt.toUser(p.userId, 'notification:new', this.toDto(n));
    }
    if (wantsPush && !this.rt.isOnline(p.userId)) await this.push(p.userId, p.text, p.link);
  }

  toDto(n: { id: string; type: string; text: string; link: string | null; read: boolean; createdAt: Date; actor: Parameters<typeof toUserSummary>[0] | null }): Notification {
    return {
      id: n.id, type: n.type as NotificationType, text: n.text, link: n.link, read: n.read,
      createdAt: n.createdAt.toISOString(), actor: n.actor ? toUserSummary(n.actor) : null,
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 60, include: { actor: { select: userSummarySelect } },
    });
    return rows.map((n) => this.toDto(n));
  }

  /** Envío push con el servicio de Expo (https://exp.host). Falla en silencio sin conexión. */
  private async push(userId: string, body: string, link?: string) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (!tokens.length) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: 'Portfol.io', body, data: { link } }))),
      });
    } catch (e) {
      this.log.debug(`Push no enviado: ${(e as Error).message}`);
    }
  }
}

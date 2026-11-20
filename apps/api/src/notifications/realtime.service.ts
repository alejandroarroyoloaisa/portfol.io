import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

/** Referencia al espacio de nombres Socket.IO (/ws) para emitir eventos desde cualquier servicio. */
@Injectable()
export class RealtimeService {
  ns: Namespace | null = null;
  toUser(userId: string, event: string, payload: unknown) {
    this.ns?.to(`user:${userId}`).emit(event, payload);
  }
  isOnline(userId: string): boolean {
    return (this.ns?.adapter.rooms.get(`user:${userId}`)?.size ?? 0) > 0;
  }
}

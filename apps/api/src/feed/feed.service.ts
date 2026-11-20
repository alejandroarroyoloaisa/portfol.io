import { Injectable } from '@nestjs/common';
import type { FeedItem, Page } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { artworkInclude, toArtwork, toCallSummary, callInclude } from '../common/mappers';
import { UsersService } from '../users/users.service';
import { NetworkService } from '../network/network.service';

const PAGE = 10;

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService, private users: UsersService, private network: NetworkService) {}

  /** RF-17: muro con la actividad de la red, paginado por cursor (fecha de publicación). */
  async feed(userId: string, cursor?: string): Promise<Page<FeedItem>> {
    const [conns, follows] = await Promise.all([
      this.prisma.connection.findMany({
        where: { status: 'aceptada', OR: [{ requesterId: userId }, { receiverId: userId }] },
        select: { requesterId: true, receiverId: true },
      }),
      this.prisma.follow.findMany({ where: { followerId: userId }, select: { followeeId: true } }),
    ]);
    const network = new Set<string>([userId]);
    conns.forEach((c) => network.add(c.requesterId === userId ? c.receiverId : c.requesterId));
    follows.forEach((f) => network.add(f.followeeId));
    // Si la red es pequeña, se completa con obra reciente de toda la plataforma
    const small = network.size < 4;
    const before = cursor ? new Date(cursor) : undefined;
    const rows = await this.prisma.artwork.findMany({
      where: {
        draft: false,
        publishedAt: before ? { lt: before } : { not: null },
        ...(small ? {} : { artistId: { in: [...network] } }),
      },
      orderBy: { publishedAt: 'desc' },
      take: PAGE + 1,
      include: artworkInclude(userId),
    });
    const hasMore = rows.length > PAGE;
    const page = rows.slice(0, PAGE);
    const items: FeedItem[] = page.map((a) => ({ kind: 'artwork', id: `a:${a.id}`, artwork: toArtwork(a), createdAt: a.publishedAt!.toISOString() }));

    if (!cursor) {
      const ctx = await this.users.matchContext(userId);
      const calls = await this.prisma.call.findMany({
        where: { status: 'abierta', closesAt: { gte: new Date() } }, include: callInclude, orderBy: { closesAt: 'asc' },
      });
      const relevant = ctx ? calls.filter((c) => toCallSummary(c, ctx).match?.matches) : calls;
      if (relevant.length) {
        items.splice(Math.min(1, items.length), 0, {
          kind: 'calls', id: 'calls', count: relevant.length,
          firstClosesAt: relevant[0].closesAt.toISOString(), createdAt: new Date().toISOString(),
        });
      }
      const sugg = (await this.network.suggestions(userId, 3)).map(({ reason: _r, ...u }) => u);
      if (sugg.length) items.splice(Math.min(4, items.length), 0, { kind: 'suggestion', id: 'suggestion', users: sugg, createdAt: new Date().toISOString() });
    }
    return { items, nextCursor: hasMore ? page[page.length - 1].publishedAt!.toISOString() : null };
  }
}

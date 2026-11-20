import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Application, ApplicationDocument, ApplicationHistoryItem, ApplicationsOverview, ApplicationStatus, CreateApplicationInput,
  OrgApplicationRow, UpdateApplicationStatusInput,
} from '@portfolio/schemas';
import { APPLICATION_STATUS_LABELS, canTransition, isFinal, isInProgress } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { artworkInclude, callInclude, toArtwork, toCallSummary, toUserSummary, userSummarySelect } from '../common/mappers';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../uploads/storage.service';
import { assertManages } from './org.util';

const include = {
  call: { include: callInclude },
  artist: { select: userSummarySelect },
  artworks: { orderBy: { order: 'asc' }, include: { artwork: { include: artworkInclude() } } },
  conversations: { select: { id: true }, take: 1 },
} satisfies Prisma.ApplicationInclude;
type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>;

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService, private users: UsersService, private notifications: NotificationsService, private storage: StorageService,
  ) {}

  toDto(a: Row, opts: { signDocs?: boolean } = {}): Application {
    const docs = (a.documents as unknown as ApplicationDocument[]) ?? [];
    return {
      id: a.id,
      call: toCallSummary(a.call, undefined, { id: a.id, status: a.status }),
      artist: toUserSummary(a.artist),
      status: a.status,
      match: a.match,
      letter: a.letter,
      artworks: a.artworks.map((x) => toArtwork(x.artwork)),
      documents: docs.map((d) => ({ ...d, url: opts.signDocs && d.key.startsWith('doc/') ? this.storage.signedUrl(d.key) : undefined })),
      history: (a.history as unknown as ApplicationHistoryItem[]) ?? [],
      feedback: a.feedback,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      updatedAt: a.updatedAt.toISOString(),
      conversationId: a.conversations[0]?.id ?? null,
    };
  }

  /** RF-24: enviar (o guardar como borrador) una solicitud con obras del portfolio, carta y documentos. */
  async apply(callId: string, artistId: string, dto: CreateApplicationInput): Promise<Application> {
    const call = await this.prisma.call.findUnique({ where: { id: callId }, include: callInclude });
    if (!call) throw new NotFoundException('Convocatoria no encontrada');
    if (call.status !== 'abierta' || call.closesAt < new Date()) throw new BadRequestException('La convocatoria está cerrada');
    const existing = await this.prisma.application.findUnique({ where: { callId_artistId: { callId, artistId } } });
    if (existing && existing.status !== 'borrador') {
      // RN-4: una solicitud enviada no se puede editar
      throw new ConflictException('Ya has enviado una solicitud a esta convocatoria');
    }
    return this.save(call, artistId, dto, existing?.id);
  }

  async updateDraft(id: string, artistId: string, dto: CreateApplicationInput) {
    const a = await this.prisma.application.findUnique({ where: { id }, include: { call: { include: callInclude } } });
    if (!a || a.artistId !== artistId) throw new NotFoundException();
    if (a.status !== 'borrador') throw new ConflictException('Una solicitud enviada no se puede editar (RN-4)');
    if (a.call.closesAt < new Date()) throw new BadRequestException('La convocatoria está cerrada');
    return this.save(a.call, artistId, dto, a.id);
  }

  private async save(call: Prisma.CallGetPayload<{ include: typeof callInclude }>, artistId: string, dto: CreateApplicationInput, id?: string) {
    const artworkIds = dto.artworkIds ?? [];
    const submit = dto.submit ?? true;
    // RN-3: número máximo de obras
    if (artworkIds.length > call.maxArtworks) throw new BadRequestException(`Esta convocatoria admite como máximo ${call.maxArtworks} obras`);
    if (submit && artworkIds.length === 0) throw new BadRequestException('Elige al menos una obra');
    const arts = await this.prisma.artwork.findMany({ where: { id: { in: artworkIds }, artistId, draft: false } });
    if (arts.length !== artworkIds.length) throw new ForbiddenException('Solo puedes presentar obras publicadas de tu portfolio');
    const docs = dto.documents ?? [];
    if (submit && call.requiresCv && !docs.some((d) => d.kind === 'cv')) throw new BadRequestException('Esta convocatoria pide el CV artístico');
    if (submit && call.requiresDossier && !docs.some((d) => d.kind === 'dossier')) throw new BadRequestException('Esta convocatoria pide un dossier');

    const ctx = await this.users.matchContext(artistId);
    const match = toCallSummary(call, ctx).match?.score ?? null;
    const now = new Date();
    const history: ApplicationHistoryItem[] = submit ? [{ status: 'enviada', at: now.toISOString(), by: artistId }] : [];
    const data = {
      letter: dto.letter ?? '',
      documents: docs as unknown as Prisma.InputJsonValue,
      status: (submit ? 'enviada' : 'borrador') as ApplicationStatus,
      match,
      submittedAt: submit ? now : null,
      history: history as unknown as Prisma.InputJsonValue,
    };
    const app = await this.prisma.$transaction(async (tx) => {
      const a = id
        ? await tx.application.update({ where: { id }, data })
        : await tx.application.create({ data: { ...data, callId: call.id, artistId } });
      await tx.applicationArtwork.deleteMany({ where: { applicationId: a.id } });
      await tx.applicationArtwork.createMany({ data: artworkIds.map((artworkId, order) => ({ applicationId: a.id, artworkId, order })) });
      return a;
    });
    if (submit) {
      const artist = await this.prisma.user.findUniqueOrThrow({ where: { id: artistId }, select: { name: true } });
      await this.notifications.notify({
        userId: call.orgId, actorId: artistId, type: 'solicitud_estado',
        text: `${artist.name} se ha presentado a «${call.title}»`, link: `call:${call.id}`,
      });
    }
    return this.get(app.id, artistId);
  }

  async get(id: string, userId: string): Promise<Application> {
    const a = await this.prisma.application.findUnique({ where: { id }, include });
    if (!a) throw new NotFoundException('Solicitud no encontrada');
    if (a.artistId !== userId) await assertManages(this.prisma, userId, a.call.orgId);
    const dto = this.toDto(a, { signDocs: true });
    const ids = [...new Set(dto.history.map((h) => h.by))];
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    dto.history = dto.history.map((h) => ({ ...h, byName: names.get(h.by) }));
    return dto;
  }

  /** RN-4: se puede retirar hasta el cierre de la convocatoria. */
  async withdraw(id: string, artistId: string) {
    const a = await this.prisma.application.findUnique({ where: { id }, include: { call: true } });
    if (!a || a.artistId !== artistId) throw new NotFoundException();
    if (a.call.closesAt < new Date()) throw new BadRequestException('La convocatoria ya ha cerrado');
    if (!canTransition(a.status, 'retirada', 'artista')) throw new BadRequestException('Esta solicitud no se puede retirar');
    await this.prisma.application.update({
      where: { id },
      data: { status: 'retirada', history: [...((a.history as unknown[]) ?? []), { status: 'retirada', at: new Date().toISOString(), by: artistId }] as Prisma.InputJsonValue },
    });
    return this.get(id, artistId);
  }

  /** RF-25: mis solicitudes con filtro y contadores. */
  async mine(artistId: string, filter: 'todas' | 'en_curso' | 'resueltas'): Promise<ApplicationsOverview> {
    const rows = await this.prisma.application.findMany({ where: { artistId }, include, orderBy: { updatedAt: 'desc' } });
    const items = rows
      .filter((a) => filter === 'todas' || (filter === 'en_curso' ? isInProgress(a.status) : isFinal(a.status)))
      .map((a) => this.toDto(a));
    const year = new Date().getFullYear();
    return {
      items,
      counts: {
        total: rows.length,
        inProgress: rows.filter((a) => isInProgress(a.status)).length,
        acceptedThisYear: rows.filter((a) => a.status === 'aceptada' && a.updatedAt.getFullYear() === year).length,
        drafts: rows.filter((a) => a.status === 'borrador').length,
      },
    };
  }

  /** RF-27: candidaturas de una convocatoria (panel de la organización). */
  async forCall(callId: string, userId: string, q: { status?: ApplicationStatus; q?: string }): Promise<OrgApplicationRow[]> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException();
    await assertManages(this.prisma, userId, call.orgId);
    const rows = await this.prisma.application.findMany({
      where: {
        callId, status: q.status ? q.status : { not: 'borrador' },
        ...(q.q ? { artist: { name: { contains: q.q, mode: 'insensitive' } } } : {}),
      },
      include,
      orderBy: [{ match: { sort: 'desc', nulls: 'last' } }, { submittedAt: 'asc' }],
    });
    return rows.map((a) => ({
      id: a.id, artist: toUserSummary(a.artist), status: a.status, match: a.match,
      artworks: a.artworks.map((x) => toArtwork(x.artwork)), submittedAt: a.submittedAt?.toISOString() ?? null,
      letterExcerpt: a.letter.length > 160 ? `${a.letter.slice(0, 157)}…` : a.letter,
    }));
  }

  /** RF-27 / RF-28: cambiar el estado y comunicar el resultado. */
  async setStatus(callId: string, id: string, userId: string, dto: UpdateApplicationStatusInput): Promise<Application> {
    const a = await this.prisma.application.findUnique({ where: { id }, include: { call: true } });
    if (!a || a.callId !== callId) throw new NotFoundException();
    await assertManages(this.prisma, userId, a.call.orgId);
    if (!canTransition(a.status, dto.status, 'organizacion')) {
      throw new BadRequestException(`No se puede pasar de «${APPLICATION_STATUS_LABELS[a.status]}» a «${APPLICATION_STATUS_LABELS[dto.status]}»`);
    }
    await this.prisma.application.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note && isFinal(dto.status) ? { feedback: dto.note } : {}),
        history: [...((a.history as unknown[]) ?? []), { status: dto.status, at: new Date().toISOString(), by: userId, note: dto.note }] as Prisma.InputJsonValue,
      },
    });
    const label = APPLICATION_STATUS_LABELS[dto.status];
    await this.notifications.notify({
      userId: a.artistId, actorId: a.call.orgId, type: 'solicitud_estado',
      text: dto.status === 'aceptada'
        ? `¡Enhorabuena! Tu solicitud a «${a.call.title}» ha sido aceptada`
        : `Tu solicitud a «${a.call.title}» está ${label}`,
      link: `application:${id}`,
    });
    return this.get(id, userId);
  }
}

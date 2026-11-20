import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { reportSchema, ReportInput } from '@portfolio/schemas';
import { z } from 'zod';
import { AuthUser, CurrentUser, Roles } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';

/** RF-35 (denuncias y moderación) y RF-05 (verificación de organizaciones). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  @Post('reports')
  async create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(reportSchema)) b: ReportInput) {
    const r = await this.prisma.report.create({ data: { ...b, reporterId: u.id } });
    return { id: r.id };
  }

  @Roles('admin')
  @Get('admin/reports')
  list() {
    return this.prisma.report.findMany({ where: { status: 'pendiente' }, orderBy: { createdAt: 'asc' } });
  }

  @Roles('admin')
  @Patch('admin/reports/:id')
  @HttpCode(204)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(z.object({ action: z.enum(['descartar', 'retirar']) }))) b: { action: 'descartar' | 'retirar' },
  ) {
    const r = await this.prisma.report.update({ where: { id }, data: { status: b.action === 'retirar' ? 'retirado' : 'descartado' } });
    if (b.action === 'retirar') {
      if (r.targetType === 'obra') await this.prisma.artwork.deleteMany({ where: { id: r.targetId } });
      if (r.targetType === 'comentario') await this.prisma.comment.deleteMany({ where: { id: r.targetId } });
      if (r.targetType === 'mensaje') await this.prisma.message.updateMany({ where: { id: r.targetId }, data: { text: '[mensaje retirado por moderación]' } });
    }
  }

  @Roles('admin')
  @Get('admin/organizations')
  pending() {
    return this.prisma.user.findMany({
      where: { role: { in: ['galeria', 'institucion'] }, verified: false },
      select: { id: true, name: true, handle: true, city: true, createdAt: true },
    });
  }

  @Roles('admin')
  @Post('admin/organizations/:id/verify')
  @HttpCode(204)
  async verify(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.user.update({ where: { id }, data: { verified: true } });
  }
}

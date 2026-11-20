import { ForbiddenException } from '@nestjs/common';
import { ORG_ROLES } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';

/** Devuelve la organización que gestiona el usuario: la propia cuenta de organización o aquella de la que es miembro. */
export async function orgOf(prisma: PrismaService, userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u) return null;
  // Primero la pertenencia: una comisaria (rol galería) gestiona la organización de la que es miembro
  const m = await prisma.orgMember.findFirst({ where: { userId }, select: { orgId: true } });
  if (m) return m.orgId;
  return ORG_ROLES.includes(u.role) ? userId : null;
}

export async function assertManages(prisma: PrismaService, userId: string, orgId: string) {
  if (userId === orgId) return;
  const m = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
  if (!m) throw new ForbiddenException('Solo los miembros de la organización pueden gestionar esta convocatoria');
}

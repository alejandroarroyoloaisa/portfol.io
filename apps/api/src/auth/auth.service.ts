import { ConflictException, Injectable, Logger, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { AuthResponse, LoginInput, RegisterInput, Role, Tokens } from '@portfolio/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { config } from '../config';
import { UsersService } from '../users/users.service';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'artista';
}

@Injectable()
export class AuthService {
  private log = new Logger('Auth');
  constructor(private prisma: PrismaService, private jwt: JwtService, private users: UsersService) {}

  async uniqueHandle(name: string): Promise<string> {
    const base = slugify(name);
    for (let i = 0; i < 20; i++) {
      const h = i === 0 ? base : `${base}${Math.floor(Math.random() * 900 + 100)}`;
      if (!(await this.prisma.user.findUnique({ where: { handle: h }, select: { id: true } }))) return h;
    }
    return `${base}.${randomUUID().slice(0, 6)}`;
  }

  async register(dto: RegisterInput): Promise<AuthResponse> {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role ?? 'artista',
        handle: await this.uniqueHandle(dto.name),
        // RNF-05: Argon2id
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
      },
    });
    return this.session(user.id, user.role);
  }

  async login(dto: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const ok = user?.passwordHash ? await argon2.verify(user.passwordHash, dto.password) : false;
    if (!user || !ok) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return this.session(user.id, user.role);
  }

  /** Renovación rotativa: cada refresh se usa una vez. Reutilizar uno revocado invalida toda la familia. */
  async refresh(refreshToken: string): Promise<Tokens> {
    let payload: { sub: string; fam: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: config.jwtRefreshSecret });
    } catch {
      throw new UnauthorizedException('Sesión caducada');
    }
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!row || row.expiresAt < new Date()) throw new UnauthorizedException('Sesión caducada');
    if (row.revokedAt) {
      this.log.warn(`Reutilización de refresh token detectada (familia ${row.family}); se revoca la familia`);
      await this.prisma.refreshToken.updateMany({ where: { family: row.family }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Sesión revocada');
    }
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub }, select: { id: true, role: true } });
    return this.issue(user.id, user.role, row.family);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(refreshToken) }, data: { revokedAt: new Date() } });
  }

  /** RF-02: recuperar la contraseña. En desarrollo el enlace se escribe en el registro del servidor. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(24).toString('hex');
      await this.prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) },
      });
      this.log.log(`Recuperación de contraseña para ${email}: ${config.webUrl}/restablecer?token=${token}`);
    }
    return { ok: true as const }; // misma respuesta exista o no la cuenta
  }

  async resetPassword(token: string, password: string) {
    const row = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) throw new UnauthorizedException('Enlace caducado');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }),
      this.prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { ok: true as const };
  }

  /** RF-01: acceso con Google (token de identidad). Apple requiere credenciales de desarrollador. */
  async oauth(provider: 'google' | 'apple', idToken: string): Promise<AuthResponse> {
    if (provider !== 'google' || !config.googleClientId) {
      throw new NotImplementedException(`El acceso con ${provider} no está configurado en este servidor`);
    }
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new UnauthorizedException('Token de Google no válido');
    const info = (await res.json()) as { aud: string; sub: string; email?: string; name?: string };
    if (info.aud !== config.googleClientId) throw new UnauthorizedException('Token de otra aplicación');
    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleId: info.sub }, { email: info.email ?? '-' }] } });
    if (!user) {
      const name = info.name ?? info.email?.split('@')[0] ?? 'Artista';
      user = await this.prisma.user.create({
        data: { googleId: info.sub, email: info.email, name, handle: await this.uniqueHandle(name) },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: info.sub } });
    }
    return this.session(user.id, user.role);
  }

  private async session(userId: string, role: Role): Promise<AuthResponse> {
    const tokens = await this.issue(userId, role, randomUUID());
    return { ...tokens, user: await this.users.me(userId) };
  }

  private async issue(userId: string, role: Role, family: string): Promise<Tokens> {
    const accessToken = this.jwt.sign({ sub: userId, role }, { secret: config.jwtSecret, expiresIn: config.accessTtlSec });
    const refreshToken = this.jwt.sign(
      { sub: userId, fam: family, jti: randomUUID() },
      { secret: config.jwtRefreshSecret, expiresIn: `${config.refreshTtlDays}d` },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId, family, tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTtlDays * 86_400_000),
      },
    });
    return { accessToken, refreshToken, expiresIn: config.accessTtlSec };
  }
}

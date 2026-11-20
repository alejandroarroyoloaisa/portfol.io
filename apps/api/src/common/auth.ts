import {
  CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@portfolio/schemas';
import { config } from '../config';

export interface AuthUser { id: string; role: Role }
export const IS_PUBLIC = 'isPublic';
/** Ruta accesible sin sesión. Si llega un token válido, se adjunta igualmente el usuario. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser);
export const OptionalUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser | undefined);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const p = this.jwt.verify<{ sub: string; role: Role }>(token, { secret: config.jwtSecret });
        req.user = { id: p.sub, role: p.role } satisfies AuthUser;
      } catch {
        if (!isPublic) throw new UnauthorizedException('Sesión caducada');
      }
    }
    if (!isPublic && !req.user) throw new UnauthorizedException('Inicia sesión para continuar');
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(req.user?.role) && req.user?.role !== 'admin') {
      throw new ForbiddenException('Tu rol no permite esta acción');
    }
    return true;
  }
}

import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, bootApp, prisma, register } from './helpers';

let app: INestApplication;
beforeAll(async () => { app = await bootApp(); });
afterAll(async () => { await app.close(); });

describe('Autenticación (RF-01, RF-02, RNF-05)', () => {
  it('registra, guarda Argon2id y devuelve el par de tokens con el perfil', async () => {
    const r = await register(app, { name: 'Nora Vidal' });
    expect(r.accessToken).toBeTruthy();
    expect(r.user.handle).toMatch(/^nora\.vidal/);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: r.user.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rechaza correos duplicados y datos no válidos con errores por campo', async () => {
    const r = await register(app);
    const dup = await api(app).post('/api/v1/auth/register').send({ name: 'Otra', email: r.email, password: 'segura123' });
    expect(dup.status).toBe(409);
    const bad = await api(app).post('/api/v1/auth/register').send({ name: 'X', email: 'no-es-correo', password: '1' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('inicia sesión y rechaza contraseñas incorrectas', async () => {
    const r = await register(app);
    expect((await api(app).post('/api/v1/auth/login').send({ email: r.email, password: 'segura123' })).status).toBe(200);
    expect((await api(app).post('/api/v1/auth/login').send({ email: r.email, password: 'mala-clave' })).status).toBe(401);
  });

  it('protege las rutas privadas', async () => {
    expect((await api(app).get('/api/v1/me')).status).toBe(401);
    expect((await api(app).get('/api/v1/me').set('Authorization', 'Bearer basura')).status).toBe(401);
  });

  it('rota el refresh token y revoca la familia si se reutiliza', async () => {
    const r = await register(app);
    const first = await api(app).post('/api/v1/auth/refresh').send({ refreshToken: r.refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(r.refreshToken);
    // reutilizar el token antiguo => ataque => se revoca toda la familia
    expect((await api(app).post('/api/v1/auth/refresh').send({ refreshToken: r.refreshToken })).status).toBe(401);
    expect((await api(app).post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken })).status).toBe(401);
  });

  it('cierra sesión invalidando el refresh', async () => {
    const r = await register(app);
    expect((await api(app).post('/api/v1/auth/logout').send({ refreshToken: r.refreshToken })).status).toBe(204);
    expect((await api(app).post('/api/v1/auth/refresh').send({ refreshToken: r.refreshToken })).status).toBe(401);
  });

  it('recupera la contraseña con un token de un solo uso', async () => {
    const r = await register(app);
    expect((await api(app).post('/api/v1/auth/forgot-password').send({ email: r.email })).body).toEqual({ ok: true });
    // el token solo se registra en el log; se genera uno propio para la prueba
    const { createHash } = await import('crypto');
    const token = `token-de-prueba-${Date.now()}-${Math.random()}`;
    await prisma.passwordReset.create({ data: { userId: r.user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60_000) } });
    expect((await api(app).post('/api/v1/auth/reset-password').send({ token, password: 'nueva-clave-1' })).status).toBe(200);
    expect((await api(app).post('/api/v1/auth/reset-password').send({ token, password: 'otra-clave-22' })).status).toBe(401);
    expect((await api(app).post('/api/v1/auth/login').send({ email: r.email, password: 'nueva-clave-1' })).status).toBe(200);
  });
});

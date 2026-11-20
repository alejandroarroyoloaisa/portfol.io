import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, bootApp, png, publishArtwork, register } from './helpers';

let app: INestApplication;
beforeAll(async () => { app = await bootApp(); });
afterAll(async () => { await app.close(); });

const MALAGA = { city: 'Málaga', lat: 36.7213, lng: -4.4214, country: 'ES' };

describe('Perfil, obras y red', () => {
  it('completa el onboarding (RF-03, RF-04) y edita el perfil (RF-07)', async () => {
    const r = await register(app);
    const me = await api(app).post('/api/v1/me/onboarding').set(r.auth)
      .send({ role: 'artista', techniques: ['acrilico', 'collage'], themes: ['interior'], location: MALAGA, acceptsCommissions: true });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ onboarded: true, city: 'Málaga', acceptsCommissions: true, techniques: ['acrilico', 'collage'] });
    const avatar = await api(app).post('/api/v1/uploads?kind=avatar').set(r.auth).attach('file', await png('#FF6B4A', 300, 300), 'a.png');
    const upd = await api(app).patch('/api/v1/me').set(r.auth).send({ headline: 'Pintora', bio: 'Interiores.', avatarKey: avatar.body.key });
    expect(upd.body.avatarUrl).toMatch(/\/media\/avatar\/.+_thumb\.webp$/);
    expect(upd.body.completion).toBeGreaterThan(50);
  });

  it('publica una obra con variantes de imagen y nunca el original (RF-08, RNF-13)', async () => {
    const r = await register(app);
    const a = await publishArtwork(app, r.auth, { newSeriesTitle: 'Casa abierta', note: 'Luz de tarde' });
    expect(a.images[0].medium).toMatch(/_medium\.webp$/);
    const got = await api(app).get(`/api/v1/artworks/${a.id}`);
    expect(got.body).toMatchObject({ title: 'Limonero', series: { title: 'Casa abierta', position: 1 } });
    const file = await api(app).get(new URL(a.images[0].medium).pathname);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
  });

  it('valida la obra con el esquema compartido', async () => {
    const r = await register(app);
    const res = await api(app).post('/api/v1/artworks').set(r.auth).send({ title: '', technique: 'oleo', widthCm: 0, heightCm: 10, year: 1500, status: 'exposicion' });
    expect(res.status).toBe(400);
  });

  it('solo la autora edita o borra; los borradores no son públicos', async () => {
    const a = await register(app);
    const b = await register(app);
    const art = await publishArtwork(app, a.auth, { draft: true });
    expect((await api(app).get(`/api/v1/artworks/${art.id}`).set(b.auth)).status).toBe(404);
    expect((await api(app).patch(`/api/v1/artworks/${art.id}`).set(b.auth).send({ title: 'Mío' })).status).toBe(403);
    const pub = await api(app).patch(`/api/v1/artworks/${art.id}`).set(a.auth).send({ draft: false });
    expect(pub.body.publishedAt).toBeTruthy();
    expect((await api(app).delete(`/api/v1/artworks/${art.id}`).set(a.auth)).status).toBe(204);
  });

  it('valora, guarda y comenta (RF-18) y avisa a la autora', async () => {
    const a = await register(app);
    const b = await register(app, { name: 'Lucía Montero' });
    const art = await publishArtwork(app, a.auth);
    expect((await api(app).post(`/api/v1/artworks/${art.id}/like`).set(b.auth)).body).toEqual({ likes: 1 });
    expect((await api(app).post(`/api/v1/artworks/${art.id}/save`).set(b.auth)).body).toEqual({ saves: 1 });
    await api(app).post(`/api/v1/artworks/${art.id}/comments`).set(b.auth).send({ text: '¡Precioso!' }).expect(201);
    const got = await api(app).get(`/api/v1/artworks/${art.id}`).set(b.auth);
    expect(got.body).toMatchObject({ likes: 1, saves: 1, comments: 1, likedByMe: true, savedByMe: true });
    const notifs = await api(app).get('/api/v1/notifications').set(a.auth);
    expect(notifs.body[0].text).toContain('Lucía Montero ha comentado');
  });

  it('conexión mutua con aceptación (RF-13, RN-1) y aparece en el muro (RF-17)', async () => {
    const a = await register(app, { name: 'Ana' });
    const b = await register(app, { name: 'Bea' });
    const art = await publishArtwork(app, b.auth, { title: 'Bodegón azul' });
    const req = await api(app).post('/api/v1/connections').set(a.auth).send({ userId: b.user.id });
    expect((await api(app).get(`/api/v1/users/${b.user.handle}`).set(a.auth)).body.connection).toBe('pending_out');
    const ov = await api(app).get('/api/v1/connections').set(b.auth);
    expect(ov.body.requests[0].user.name).toBe('Ana');
    expect((await api(app).post(`/api/v1/connections/${req.body.id}/accept`).set(a.auth)).status).toBe(403);
    await api(app).post(`/api/v1/connections/${req.body.id}/accept`).set(b.auth).expect(204);
    expect((await api(app).get(`/api/v1/users/${b.user.handle}`).set(a.auth)).body.connection).toBe('connected');
    const feed = await api(app).get('/api/v1/feed').set(a.auth);
    expect(feed.body.items.some((i: { artwork?: { id: string } }) => i.artwork?.id === art.id)).toBe(true);
  });

  it('valida técnicas declaradas (RF-16)', async () => {
    const a = await register(app);
    const b = await register(app);
    await api(app).post('/api/v1/me/onboarding').set(b.auth).send({ techniques: ['oleo'] });
    expect((await api(app).post(`/api/v1/users/${b.user.id}/endorsements`).set(a.auth).send({ technique: 'acuarela' })).status).toBe(400);
    await api(app).post(`/api/v1/users/${b.user.id}/endorsements`).set(a.auth).send({ technique: 'oleo' }).expect(204);
    expect((await api(app).get(`/api/v1/users/${b.user.id}`).set(a.auth)).body.endorsements).toEqual({ oleo: 1 });
  });

  it('busca por texto, técnica y distancia con PostGIS (RF-19, RF-20)', async () => {
    const me = await register(app);
    await api(app).post('/api/v1/me/onboarding').set(me.auth).send({ location: MALAGA });
    const near = await register(app, { name: 'Pintora Granadina' });
    await api(app).post('/api/v1/me/onboarding').set(near.auth).send({ techniques: ['oleo'], location: { city: 'Granada', lat: 37.1773, lng: -3.5986, country: 'ES' } });
    const far = await register(app, { name: 'Pintora Bilbaína' });
    await api(app).post('/api/v1/me/onboarding').set(far.auth).send({ techniques: ['oleo'], location: { city: 'Bilbao', lat: 43.263, lng: -2.935, country: 'ES' } });
    await publishArtwork(app, near.auth, { title: 'Mareas de otoño', technique: 'oleo', note: 'Atardecer en la costa' });
    const res = await api(app).get('/api/v1/search?type=artistas&technique=oleo&km=200').set(me.auth);
    const names = res.body.artists.map((a: { name: string }) => a.name);
    expect(names).toContain('Pintora Granadina');
    expect(names).not.toContain('Pintora Bilbaína');
    expect(res.body.artists.find((a: { name: string }) => a.name === 'Pintora Granadina').distanceKm).toBeGreaterThan(80);
    const text = await api(app).get('/api/v1/search?q=atardecer&type=obras');
    expect(text.body.artworks.map((a: { title: string }) => a.title)).toContain('Mareas de otoño');
    // Búsqueda por temática y paginación por cursor
    await publishArtwork(app, near.auth, { title: 'Vista del puerto', themes: ['paisaje'] });
    const theme = await api(app).get('/api/v1/search?q=paisaje&type=obras');
    expect(theme.body.artworks.map((a: { title: string }) => a.title)).toContain('Vista del puerto');
    const p1 = await api(app).get('/api/v1/search?type=obras&limit=1');
    expect(p1.body.nextCursor).toBe('1');
    const p2 = await api(app).get('/api/v1/search?type=obras&limit=1&cursor=1');
    expect(p2.body.artworks[0].id).not.toBe(p1.body.artworks[0].id);
  });

  it('exporta y suprime la cuenta (RF-34)', async () => {
    const r = await register(app);
    const ex = await api(app).get('/api/v1/me/export').set(r.auth);
    expect(ex.body.user.email).toBe(r.email);
    expect(ex.body.user.passwordHash).toBeUndefined();
    await api(app).delete('/api/v1/me').set(r.auth).expect(204);
    expect((await api(app).post('/api/v1/auth/login').send({ email: r.email, password: 'segura123' })).status).toBe(401);
  });
});

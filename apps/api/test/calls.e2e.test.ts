import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, bootApp, PDF, prisma, publishArtwork, register } from './helpers';

let app: INestApplication;
let url: string;
beforeAll(async () => {
  app = await bootApp();
  await app.listen(0);
  url = await app.getUrl();
});
afterAll(async () => { await app.close(); });

const GRANADA = { city: 'Granada', lat: 37.1773, lng: -3.5986, country: 'ES' };
const call = {
  type: 'exposicion', title: '«Nuevos realismos»', closesAt: new Date(Date.now() + 10 * 86_400_000).toISOString(), scope: 'regional',
  techniques: ['acrilico'], themes: ['interior'], maxArtworks: 2, maxFormatCm: 120, requiresCv: true, requiresDossier: false,
};

async function setup() {
  const org = await register(app, { name: 'Galería Prueba', role: 'galeria' });
  await api(app).post('/api/v1/me/onboarding').set(org.auth).send({ location: GRANADA });
  const artist = await register(app, { name: 'Nora Vidal' });
  await api(app).post('/api/v1/me/onboarding').set(artist.auth).send({ techniques: ['acrilico'], themes: ['interior'], location: { city: 'Málaga', lat: 36.72, lng: -4.42, country: 'ES' } });
  const works = [await publishArtwork(app, artist.auth), await publishArtwork(app, artist.auth), await publishArtwork(app, artist.auth)];
  return { org, artist, works };
}

async function cvDoc(auth: Record<string, string>) {
  const up = await api(app).post('/api/v1/uploads?kind=documento').set(auth).attach('file', PDF, 'cv.pdf');
  expect(up.status).toBe(201);
  return { kind: 'cv', key: up.body.key, name: 'cv.pdf', sizeBytes: up.body.sizeBytes };
}

describe('Convocatorias y solicitudes', () => {
  it('solo organizaciones verificadas publican (RN-2)', async () => {
    const { org, artist } = await setup();
    expect((await api(app).post('/api/v1/calls').set(artist.auth).send(call)).status).toBe(403);
    expect((await api(app).post('/api/v1/calls').set(org.auth).send(call)).status).toBe(403);
    await prisma.user.update({ where: { id: org.user.id }, data: { verified: true } });
    const res = await api(app).post('/api/v1/calls').set(org.auth).send(call);
    expect(res.status).toBe(201);
    expect(res.body.city).toBe('Granada');
  });

  it('calcula el encaje y avisa a las artistas que encajan (RF-22)', async () => {
    const { org, artist } = await setup();
    await prisma.user.update({ where: { id: org.user.id }, data: { verified: true } });
    const c = await api(app).post('/api/v1/calls').set(org.auth).send(call);
    const list = await api(app).get('/api/v1/calls?match=true').set(artist.auth);
    const mine = list.body.find((x: { id: string }) => x.id === c.body.id);
    expect(mine.match.score).toBeGreaterThanOrEqual(75);
    expect(mine.match.matches).toBe(true);
    const n = await api(app).get('/api/v1/notifications').set(artist.auth);
    expect(n.body.some((x: { type: string; link: string }) => x.type === 'convocatoria_encaje' && x.link === `call:${c.body.id}`)).toBe(true);
  });

  it('flujo completo: borrador, envío con límites, revisión, aceptación y aviso (RF-24..28, RN-3, RN-4)', async () => {
    const { org, artist, works } = await setup();
    await prisma.user.update({ where: { id: org.user.id }, data: { verified: true } });
    const c = (await api(app).post('/api/v1/calls').set(org.auth).send(call)).body;
    const ids = works.map((w) => w.id);

    // RN-3: máximo de obras
    const tooMany = await api(app).post(`/api/v1/calls/${c.id}/applications`).set(artist.auth).send({ artworkIds: ids, letter: 'Hola', documents: [] });
    expect(tooMany.status).toBe(400);
    // Requisito de CV
    const noCv = await api(app).post(`/api/v1/calls/${c.id}/applications`).set(artist.auth).send({ artworkIds: ids.slice(0, 2), letter: 'Hola' });
    expect(noCv.body.message).toContain('CV');
    // Borrador (RF-25)
    const draft = await api(app).post(`/api/v1/calls/${c.id}/applications`).set(artist.auth).send({ artworkIds: [ids[0]], letter: 'Borrador', submit: false });
    expect(draft.body.status).toBe('borrador');
    // Enviar
    const sent = await api(app).patch(`/api/v1/applications/${draft.body.id}`).set(artist.auth)
      .send({ artworkIds: ids.slice(0, 2), letter: 'Presento dos obras.', documents: [await cvDoc(artist.auth)] });
    expect(sent.body).toMatchObject({ status: 'enviada' });
    expect(sent.body.match).toBeGreaterThan(0);
    expect(sent.body.documents[0].url).toMatch(/\/api\/v1\/files\/.+sig=/);
    // RN-4: no se edita tras enviarla
    expect((await api(app).patch(`/api/v1/applications/${draft.body.id}`).set(artist.auth).send({ artworkIds: [ids[0]] })).status).toBe(409);
    // Documento por URL firmada
    const docUrl = new URL(sent.body.documents[0].url);
    expect((await api(app).get(docUrl.pathname + docUrl.search)).status).toBe(200);
    expect((await api(app).get(docUrl.pathname + '?exp=1&sig=x')).status).toBe(403);

    // Otra artista no ve la candidatura; la organización sí
    const other = await register(app);
    expect((await api(app).get(`/api/v1/calls/${c.id}/applications`).set(other.auth)).status).toBe(403);
    const rows = await api(app).get(`/api/v1/calls/${c.id}/applications`).set(org.auth);
    expect(rows.body).toHaveLength(1);
    // Transiciones válidas e inválidas
    expect((await api(app).patch(`/api/v1/calls/${c.id}/applications/${draft.body.id}`).set(org.auth).send({ status: 'aceptada' })).status).toBe(400);
    for (const s of ['en_revision', 'preseleccionada', 'aceptada']) {
      const r = await api(app).patch(`/api/v1/calls/${c.id}/applications/${draft.body.id}`).set(org.auth).send({ status: s, note: s === 'aceptada' ? '¡Bienvenida!' : undefined });
      expect(r.status).toBe(200);
    }
    const mine = await api(app).get('/api/v1/me/applications').set(artist.auth);
    expect(mine.body.items[0]).toMatchObject({ status: 'aceptada', feedback: '¡Bienvenida!' });
    expect(mine.body.items[0].history.map((h: { status: string }) => h.status)).toEqual(['enviada', 'en_revision', 'preseleccionada', 'aceptada']);
    const n = await api(app).get('/api/v1/notifications').set(artist.auth);
    expect(n.body[0].text).toContain('Enhorabuena');
    // Panel de organización
    const dash = await api(app).get('/api/v1/org/dashboard').set(org.auth);
    expect(dash.body.calls[0].byStatus).toEqual({ aceptada: 1 });
    // Una comisaria (rol galería) miembro de la organización gestiona su panel
    const curator = await register(app, { role: 'galeria' });
    await prisma.orgMember.create({ data: { orgId: org.user.id, userId: curator.user.id } });
    const cd = await api(app).get('/api/v1/org/dashboard').set(curator.auth);
    expect(cd.body.organization.id).toBe(org.user.id);
    expect((await api(app).get('/api/v1/me').set(curator.auth)).body.orgId).toBe(org.user.id);
    const full = await api(app).get(`/api/v1/calls/${c.id}/applications/${draft.body.id}`).set(curator.auth);
    expect(full.body.history[0].byName).toBe('Nora Vidal');
  });

  it('la artista puede retirar una solicitud enviada (RN-4)', async () => {
    const { org, artist, works } = await setup();
    await prisma.user.update({ where: { id: org.user.id }, data: { verified: true } });
    const c = (await api(app).post('/api/v1/calls').set(org.auth).send({ ...call, requiresCv: false })).body;
    const a = await api(app).post(`/api/v1/calls/${c.id}/applications`).set(artist.auth).send({ artworkIds: [works[0].id] });
    const w = await api(app).post(`/api/v1/applications/${a.body.id}/withdraw`).set(artist.auth);
    expect(w.body.status).toBe('retirada');
    expect((await api(app).post(`/api/v1/applications/${a.body.id}/withdraw`).set(artist.auth)).status).toBe(400);
  });

  it('no admite obras ajenas', async () => {
    const { org, artist } = await setup();
    await prisma.user.update({ where: { id: org.user.id }, data: { verified: true } });
    const c = (await api(app).post('/api/v1/calls').set(org.auth).send({ ...call, requiresCv: false })).body;
    const other = await register(app);
    const foreign = await publishArtwork(app, other.auth);
    expect((await api(app).post(`/api/v1/calls/${c.id}/applications`).set(artist.auth).send({ artworkIds: [foreign.id] })).status).toBe(403);
  });
});

describe('Mensajería (RF-29, RF-30, RN-5)', () => {
  function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const s = io(`${url}/ws`, { auth: { token }, transports: ['websocket'] });
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });
  }

  it('exige contexto o conexión para escribir (RN-5)', async () => {
    const a = await register(app);
    const b = await register(app);
    expect((await api(app).post('/api/v1/conversations').set(a.auth).send({ userId: b.user.id, text: 'Hola' })).status).toBe(403);
    const req = await api(app).post('/api/v1/connections').set(a.auth).send({ userId: b.user.id });
    await api(app).post(`/api/v1/connections/${req.body.id}/accept`).set(b.auth).expect(204);
    expect((await api(app).post('/api/v1/conversations').set(a.auth).send({ userId: b.user.id, text: 'Hola' })).status).toBe(201);
  });

  it('a una organización se le puede escribir desde su perfil (RN-5)', async () => {
    const a = await register(app);
    const org = await register(app, { role: 'galeria' });
    expect((await api(app).post('/api/v1/conversations').set(a.auth).send({ userId: org.user.id, text: '¿Aceptáis dossieres?' })).status).toBe(201);
  });

  it('entrega en tiempo real, cuenta no leídos y busca en la bandeja', async () => {
    const a = await register(app, { name: 'Ana Emisora' });
    const b = await register(app, { name: 'Bea Receptora' });
    const req = await api(app).post('/api/v1/connections').set(a.auth).send({ userId: b.user.id });
    await api(app).post(`/api/v1/connections/${req.body.id}/accept`).set(b.auth);
    const conv = await api(app).post('/api/v1/conversations').set(a.auth).send({ userId: b.user.id });
    const sb = await connectSocket(b.accessToken);
    const sa = await connectSocket(a.accessToken);
    const got = new Promise<{ text: string }>((res) => sb.on('message:new', res));
    const typing = new Promise<{ typing: boolean }>((res) => sb.on('typing', res));
    sa.emit('typing', { conversationId: conv.body.id, typing: true });
    expect((await typing).typing).toBe(true);
    const ack = await new Promise<{ ok: boolean }>((res) => sa.emit('message:send', { conversationId: conv.body.id, text: '¿Hablamos el jueves?' }, res));
    expect(ack.ok).toBe(true);
    expect((await got).text).toBe('¿Hablamos el jueves?');
    const inbox = await api(app).get('/api/v1/conversations').set(b.auth);
    expect(inbox.body[0]).toMatchObject({ unread: 1, other: { name: 'Ana Emisora' } });
    await api(app).post(`/api/v1/conversations/${conv.body.id}/read`).set(b.auth).expect(204);
    expect((await api(app).get('/api/v1/conversations').set(b.auth)).body[0].unread).toBe(0);
    expect((await api(app).get('/api/v1/conversations?q=jueves').set(b.auth)).body).toHaveLength(1);
    expect((await api(app).get('/api/v1/conversations?q=inexistente').set(b.auth)).body).toHaveLength(0);
    const stranger = await register(app);
    expect((await api(app).get(`/api/v1/conversations/${conv.body.id}/messages`).set(stranger.auth)).status).toBe(403);
    sa.close();
    sb.close();
  });
});

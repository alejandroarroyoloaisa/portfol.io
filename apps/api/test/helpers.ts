import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import request from 'supertest';
import { createApp } from '../src/app.factory';

export const prisma = new PrismaClient();
let n = 0;

export async function bootApp(): Promise<INestApplication> {
  const app = await createApp({ logger: !!process.env.TEST_LOGS });
  await app.init();
  return app;
}

export function api(app: INestApplication) {
  return request(app.getHttpServer());
}

export async function register(app: INestApplication, over: Partial<{ name: string; role: string; email: string }> = {}) {
  n++;
  const email = over.email ?? `user${n}-${Date.now()}@test.es`;
  const res = await api(app).post('/api/v1/auth/register').send({ name: over.name ?? `Usuaria ${n}`, email, password: 'segura123', role: over.role });
  if (res.status !== 201) throw new Error(`registro: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...res.body, email, auth: { Authorization: `Bearer ${res.body.accessToken}` } } as {
    accessToken: string; refreshToken: string; email: string; user: { id: string; handle: string }; auth: Record<string, string>;
  };
}

export async function png(color = '#2340E8', w = 600, h = 400) {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
}

export async function publishArtwork(app: INestApplication, auth: Record<string, string>, over: Record<string, unknown> = {}) {
  const up = await api(app).post('/api/v1/uploads?kind=obra').set(auth).attach('file', await png(), 'obra.png');
  if (up.status !== 201) throw new Error(`upload ${up.status} ${JSON.stringify(up.body)}`);
  const res = await api(app).post('/api/v1/artworks').set(auth).send({
    title: 'Limonero', technique: 'acrilico', widthCm: 60, heightCm: 73, year: 2025, status: 'exposicion', imageKeys: [up.body.key], ...over,
  });
  if (res.status !== 201) throw new Error(`artwork ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; images: { medium: string }[] };
}

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Carga mínima de .env sin dependencias
const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`Falta la variable de entorno ${k}`);
  return v;
};

export const config = {
  port: Number(env('PORT', '3000')),
  jwtSecret: env('JWT_SECRET', 'dev-access-secret-cambiar'),
  jwtRefreshSecret: env('JWT_REFRESH_SECRET', 'dev-refresh-secret-cambiar'),
  accessTtlSec: 15 * 60,
  refreshTtlDays: 30,
  publicUrl: env('PUBLIC_URL', 'http://localhost:3000').replace(/\/$/, ''),
  webUrl: env('WEB_URL', 'http://localhost:3001').replace(/\/$/, ''),
  corsOrigins: env('CORS_ORIGINS', 'http://localhost:3001,http://localhost:8081').split(',').map((s) => s.trim()),
  uploadDir: resolve(join(__dirname, '..'), env('UPLOAD_DIR', './uploads')),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
};

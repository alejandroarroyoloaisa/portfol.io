import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { config } from '../config';
import { mediaUrl, toImage } from '../common/mappers';

/**
 * Almacenamiento de ficheros en disco local (equivale al bucket S3 de producción).
 * - Imágenes públicas: se generan tres variantes WebP y NUNCA se guarda ni sirve el original (RNF-13).
 * - Documentos (CV, dosier): carpeta privada, servidos con URL firmada de corta duración.
 */
@Injectable()
export class StorageService {
  readonly publicDir = join(config.uploadDir, 'public');
  readonly privateDir = join(config.uploadDir, 'private');

  constructor() {
    for (const d of ['img', 'avatar'].map((x) => join(this.publicDir, x)).concat(this.privateDir)) mkdirSync(d, { recursive: true });
  }

  async saveImage(buf: Buffer, kind: 'img' | 'avatar' = 'img', watermark = false) {
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buf).metadata();
    } catch {
      throw new BadRequestException('La imagen no es válida');
    }
    if (!meta.width || !meta.height) throw new BadRequestException('La imagen no es válida');
    const key = `${kind}/${randomUUID()}`;
    const base = sharp(buf).rotate();
    const sizes = kind === 'avatar' ? { thumb: 160, medium: 480, large: 480 } : { thumb: 400, medium: 1000, large: 1600 };
    const { dominant } = await sharp(buf).stats();
    for (const [name, w] of Object.entries(sizes)) {
      let img = base.clone().resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true });
      if (watermark && name !== 'thumb' && kind === 'img') {
        const svg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="80"><text x="50%" y="55" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(w / 18)}" font-weight="700" fill="rgba(255,255,255,0.55)" stroke="rgba(0,0,0,0.25)">portfol.io</text></svg>`,
        );
        img = sharp(await img.toBuffer()).composite([{ input: svg, gravity: 'south' }]);
      }
      await img.webp({ quality: name === 'thumb' ? 70 : 82 }).toFile(join(this.publicDir, `${key}_${name}.webp`));
    }
    const rot = (meta.orientation ?? 1) >= 5;
    const width = rot ? meta.height : meta.width;
    const height = rot ? meta.width : meta.height;
    const color = `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    return { key, width, height, color, image: toImage({ key, width, height, color }), url: mediaUrl(`${key}_medium.webp`) };
  }

  async saveDocument(buf: Buffer, originalName: string) {
    if (buf.subarray(0, 4).toString() !== '%PDF') throw new BadRequestException('Solo se admiten documentos PDF');
    const key = `doc/${randomUUID()}.pdf`;
    await writeFile(join(this.privateDir, key.replace('doc/', '')), buf);
    return { key, name: originalName, sizeBytes: buf.length };
  }

  /** URL firmada válida durante 10 minutos. */
  signedUrl(key: string, ttlSec = 600): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    return `${config.publicUrl}/api/v1/files/${encodeURIComponent(key)}?exp=${exp}&sig=${this.sign(key, exp)}`;
  }

  sign(key: string, exp: number) {
    return createHmac('sha256', config.jwtSecret).update(`${key}:${exp}`).digest('hex').slice(0, 32);
  }

  privatePath(key: string) {
    if (!/^doc\/[0-9a-f-]{36}\.pdf$/.test(key)) throw new BadRequestException();
    return join(this.privateDir, key.replace('doc/', ''));
  }
}

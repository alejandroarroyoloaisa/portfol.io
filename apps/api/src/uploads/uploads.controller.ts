import {
  BadRequestException, Controller, ForbiddenException, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync } from 'fs';
import type { UploadResult } from '@portfolio/schemas';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { settingsOf } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const MAX = 15 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller()
export class UploadsController {
  constructor(private storage: StorageService, private prisma: PrismaService) {}

  /** Subida multiparte (campo «file»). kind = obra | avatar | documento. */
  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX } }))
  async upload(
    @CurrentUser() u: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('kind') kind: 'obra' | 'avatar' | 'documento' = 'obra',
  ): Promise<UploadResult> {
    if (!file) throw new BadRequestException('Falta el fichero');
    if (kind === 'documento') {
      const d = await this.storage.saveDocument(file.buffer, file.originalname);
      return { ...d, url: this.storage.signedUrl(d.key) };
    }
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('El fichero debe ser una imagen');
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { settings: true } });
    const r = await this.storage.saveImage(file.buffer, kind === 'avatar' ? 'avatar' : 'img', settingsOf(me.settings).watermark);
    // Se guarda la geometría en la clave para poder asociarla después a la obra
    return { key: `${r.key}|${r.width}|${r.height}|${r.color}`, url: r.url, image: r.image, name: file.originalname, sizeBytes: file.size };
  }

  @Public()
  @Get('files/:key')
  file(@Param('key') key: string, @Query('exp') exp: string, @Query('sig') sig: string, @Res() res: Response) {
    const e = Number(exp);
    if (!e || e < Date.now() / 1000 || sig !== this.storage.sign(key, e)) throw new ForbiddenException('Enlace caducado');
    const path = this.storage.privatePath(key);
    if (!existsSync(path)) throw new BadRequestException('No existe');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.sendFile(path);
  }
}

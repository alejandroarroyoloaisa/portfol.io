import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Traduce errores conocidos de Prisma a respuestas HTTP coherentes. */
@Catch()
export class ErrorsFilter implements ExceptionFilter {
  private log = new Logger('Error');
  catch(e: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw e;
    const res = host.switchToHttp().getResponse<Response>();
    if (e instanceof HttpException) {
      const body = e.getResponse();
      return res.status(e.getStatus()).json(typeof body === 'string' ? { statusCode: e.getStatus(), message: body } : body);
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return res.status(409).json({ statusCode: 409, message: 'Ya existe un registro con esos datos' });
      if (e.code === 'P2025') return res.status(404).json({ statusCode: 404, message: 'No encontrado' });
      if (e.code === 'P2003') return res.status(400).json({ statusCode: 400, message: 'Referencia no válida' });
    }
    this.log.error(e instanceof Error ? e.stack : String(e));
    return res.status(500).json({ statusCode: 500, message: 'Error interno' });
  }
}

import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType, ZodError } from 'zod';

/** Valida el cuerpo o la consulta con un esquema Zod compartido de @portfolio/schemas. */
export class ZodPipe<T> implements PipeTransform {
  constructor(private schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (!r.success) throw zodToHttp(r.error);
    return r.data;
  }
}

export function zodToHttp(e: ZodError) {
  return new BadRequestException({
    statusCode: 400,
    message: e.issues[0]?.message ?? 'Datos no válidos',
    errors: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

/** Normaliza consultas con arrays (?technique=a&technique=b o ?technique=a). */
export function arrayQuery(v: unknown): string[] | undefined {
  if (v === undefined || v === '') return undefined;
  return Array.isArray(v) ? (v as string[]) : String(v).split(',');
}

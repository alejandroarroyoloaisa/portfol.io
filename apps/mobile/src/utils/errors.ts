import { ApiRequestError } from '@portfolio/api-client';
import { t } from '../i18n';

/** Mensaje legible para la persona usuaria a partir de cualquier error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message || t.common.unknownError;
  if (e instanceof TypeError) return t.common.networkError; // fetch lanza TypeError sin red
  if (e instanceof Error && e.message) return e.message;
  return t.common.unknownError;
}

/** Errores de validación por campo devueltos por la API (ZodError serializado). */
export function fieldErrors(e: unknown): Record<string, string> {
  return e instanceof ApiRequestError ? e.fieldErrors : {};
}

export const isNetworkError = (e: unknown) => e instanceof TypeError;
export const isStatus = (e: unknown, status: number) => e instanceof ApiRequestError && e.status === status;

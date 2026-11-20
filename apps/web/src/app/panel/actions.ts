'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  APPLICATION_STATUS_LABELS, startConversationSchema, updateApplicationStatusSchema, type CallDetail,
} from '@portfolio/schemas';
import { parseCallForm, type CallFormErrors } from '@/lib/call-form';
import { apiErrorMessage, getActionApi, readTokens } from '@/lib/session';
import { ApiRequestError } from '@portfolio/api-client';

export interface ActionResult {
  ok: boolean;
  message?: string;
  /** Marca de tiempo para que el cliente distinga dos respuestas iguales seguidas. */
  at?: number;
}

async function requireSession() {
  if (!(await readTokens())) redirect('/acceder?caducada=1');
  return getActionApi();
}

function rethrowAuth(e: unknown) {
  if (e instanceof ApiRequestError && e.status === 401) redirect('/acceder?caducada=1');
}

/** Cierra la sesión: revoca el refresh token en la API y borra las cookies. */
export async function logout() {
  const api = await getActionApi();
  try {
    await api.auth.logout();
  } catch {
    /* aunque la API no responda, las cookies ya se han borrado */
  }
  redirect('/acceder?salida=1');
}

/**
 * Cambia el estado de una candidatura (RF-27). La API valida la transición, guarda la nota en el
 * historial y avisa a la artista con una notificación (RF-28).
 */
export async function changeApplicationStatus(callId: string, applicationId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = updateApplicationStatusSchema.safeParse({
    status: fd.get('status'),
    note: typeof fd.get('note') === 'string' && String(fd.get('note')).trim() ? String(fd.get('note')).trim() : undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Datos no válidos', at: Date.now() };
  const api = await requireSession();
  try {
    await api.calls.setStatus(callId, applicationId, parsed.data);
  } catch (e) {
    rethrowAuth(e);
    return { ok: false, message: apiErrorMessage(e), at: Date.now() };
  }
  revalidatePath(`/panel/convocatorias/${callId}`, 'layout');
  revalidatePath('/panel');
  return { ok: true, message: `Candidatura marcada como «${APPLICATION_STATUS_LABELS[parsed.data.status]}». Se ha avisado a la artista.`, at: Date.now() };
}

/** Escribe a la artista desde una solicitud: abre (o reutiliza) la conversación con contexto. */
export async function messageArtist(
  ctx: { artistId: string; callId: string; applicationId: string },
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = startConversationSchema.safeParse({
    userId: ctx.artistId, callId: ctx.callId, applicationId: ctx.applicationId, text: String(fd.get('text') ?? ''),
  });
  if (!parsed.success) return { ok: false, message: 'Escribe un mensaje (máximo 2000 caracteres).', at: Date.now() };
  const api = await requireSession();
  try {
    await api.conversations.start(parsed.data);
  } catch (e) {
    rethrowAuth(e);
    return { ok: false, message: apiErrorMessage(e), at: Date.now() };
  }
  revalidatePath(`/panel/convocatorias/${ctx.callId}/solicitudes/${ctx.applicationId}`);
  return { ok: true, message: 'Mensaje enviado. La artista lo verá en su bandeja de la app.', at: Date.now() };
}

export interface CallFormState {
  errors?: CallFormErrors;
  message?: string;
}

/** Crea (callId = null) o actualiza una convocatoria (RF-26). */
export async function saveCall(callId: string | null, _prev: CallFormState, fd: FormData): Promise<CallFormState> {
  const mode = callId ? 'update' : 'create';
  const parsed = parseCallForm(fd, mode);
  if (!parsed.success) return { errors: parsed.errors, message: 'Revisa los campos marcados.' };
  const api = await requireSession();
  let saved: CallDetail;
  try {
    saved = callId ? await api.calls.update(callId, parsed.data) : await api.calls.create(parsed.data as Parameters<typeof api.calls.create>[0]);
  } catch (e) {
    rethrowAuth(e);
    if (e instanceof ApiRequestError && Object.keys(e.fieldErrors).length) {
      return { errors: e.fieldErrors, message: 'La API ha rechazado algunos campos.' };
    }
    return { message: apiErrorMessage(e) };
  }
  revalidatePath('/panel', 'layout');
  revalidatePath('/convocatorias');
  revalidatePath(`/convocatorias/${saved.id}`);
  revalidatePath(`/${saved.organization.handle}`);
  revalidatePath('/');
  redirect(`/panel/convocatorias/${saved.id}?guardada=${callId ? 'editada' : 'creada'}`);
}

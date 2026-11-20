'use client';

import { useActionState, useEffect, useRef } from 'react';
import { firstName } from '@/lib/format';
import { messageArtist, type ActionResult } from '../actions';

/** «Escribir a la artista»: abre la conversación con el contexto de la solicitud. */
export function MessageForm({ artistId, artistName, callId, applicationId, hasConversation }: {
  artistId: string;
  artistName: string;
  callId: string;
  applicationId: string;
  hasConversation: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    messageArtist.bind(null, { artistId, callId, applicationId }),
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} style={{ display: 'grid', gap: 12 }}>
      <div className="field">
        <label htmlFor="mensaje">Mensaje para {firstName(artistName)}</label>
        <textarea id="mensaje" name="text" className="textarea" required maxLength={2000} rows={4} placeholder={`Hola, ${firstName(artistName)}: …`} />
        <p className="hint">
          {hasConversation
            ? 'Ya tenéis una conversación sobre esta solicitud: el mensaje se añadirá a ella.'
            : 'Se abrirá una conversación vinculada a esta solicitud. La respuesta te llegará a la bandeja de la app.'}
        </p>
      </div>
      {state.message && (
        <p className={state.ok ? 'form-ok' : 'form-alert'} role={state.ok ? 'status' : 'alert'}>{state.message}</p>
      )}
      <div>
        <button type="submit" className="btn btn-cobalt" disabled={pending}>
          {pending ? 'Enviando…' : `Escribir a ${firstName(artistName)}`}
        </button>
      </div>
    </form>
  );
}

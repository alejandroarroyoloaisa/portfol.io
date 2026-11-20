'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { nextStatuses, type ApplicationStatus } from '@portfolio/schemas';
import { STATUS_ACTION_LABELS, applicationStatusLabel, firstName } from '@/lib/format';
import { changeApplicationStatus, type ActionResult } from '../actions';
import styles from './StatusActions.module.css';

const BUTTON_CLASS: Partial<Record<ApplicationStatus, string>> = {
  en_revision: 'btn-white',
  preseleccionada: 'btn-green',
  aceptada: 'btn-cobalt',
  no_seleccionada: '',
};

/** Orden de los botones: primero avanzar, al final descartar. */
const ORDER: ApplicationStatus[] = ['preseleccionada', 'aceptada', 'en_revision', 'no_seleccionada'];

const HINTS: Partial<Record<ApplicationStatus, string>> = {
  en_revision: 'La artista verá el cambio de estado en la app.',
  preseleccionada: 'La artista recibirá un aviso de que está preseleccionada.',
  aceptada: 'La artista recibirá un aviso de que ha sido seleccionada. Este estado es definitivo.',
  no_seleccionada: 'La artista recibirá un aviso de que no ha sido seleccionada. Este estado es definitivo.',
};

/**
 * Acciones de la organización sobre una candidatura según las transiciones permitidas
 * (`nextStatuses(estado, 'organizacion')`). Cada acción pide confirmación y una nota opcional
 * para la artista (RF-27, RF-28).
 */
export function StatusActions({
  callId, applicationId, status, artistName, size = 'sm',
}: {
  callId: string;
  applicationId: string;
  status: ApplicationStatus;
  artistName: string;
  size?: 'sm' | 'md';
}) {
  const options = nextStatuses(status, 'organizacion').sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const [target, setTarget] = useState<ApplicationStatus | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    changeApplicationStatus.bind(null, callId, applicationId),
    { ok: false },
  );

  useEffect(() => {
    if (target) dialogRef.current?.showModal();
  }, [target]);

  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state]);

  if (!options.length) {
    return <span className={styles.final}>{status === 'retirada' ? 'retirada por la artista' : 'decisión tomada'}</span>;
  }

  const btn = size === 'sm' ? 'btn btn-sm' : 'btn';
  return (
    <>
      <div className={`${styles.row}${size === 'sm' ? ` ${styles.nowrap}` : ''}`}>
        {options.map((s) => (
          <button
            key={s}
            type="button"
            className={`${btn} ${BUTTON_CLASS[s] ?? ''}`}
            onClick={() => setTarget(s)}
            aria-label={`${STATUS_ACTION_LABELS[s] ?? s}: ${artistName}`}
          >
            {STATUS_ACTION_LABELS[s] ?? s}
          </button>
        ))}
      </div>
      {state.ok && state.message && size === 'md' && (
        <p className={`form-ok ${styles.toast}`} role="status">{state.message}</p>
      )}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClose={() => setTarget(null)}>
        {target && (
          <form action={action} className={styles.form}>
            <input type="hidden" name="status" value={target} />
            <h2 id={titleId} className={styles.title}>
              {target === 'en_revision' ? `Pasar a revisión la solicitud de ${artistName}` : `${STATUS_ACTION_LABELS[target]} a ${artistName}`}
            </h2>
            <p>
              Pasará a «{applicationStatusLabel(target)}». {HINTS[target]}
            </p>
            <div className="field">
              <label htmlFor={noteId}>Nota para {firstName(artistName)} (opcional)</label>
              <textarea id={noteId} name="note" className="textarea" maxLength={400} rows={3} placeholder="Por ejemplo: «Nos gustó mucho la serie; te escribimos para hablar de fechas»." />
              <p className="hint">Máximo 400 caracteres. Quedará en el historial de la solicitud.</p>
            </div>
            {!state.ok && state.message && <p className="form-alert" role="alert">{state.message}</p>}
            <div className={styles.buttons}>
              <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>Cancelar</button>
              <button type="submit" className={`btn ${target === 'no_seleccionada' ? 'btn-ink' : 'btn-cobalt'}`} disabled={pending}>
                {pending ? 'Guardando…' : `Confirmar: ${STATUS_ACTION_LABELS[target]?.toLowerCase()}`}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

'use client';

import Link from 'next/link';
import { startTransition, useActionState, useId, useState, type FormEvent } from 'react';
import {
  CALL_STATUS, CALL_TYPES, SCOPES, SCOPE_LABELS, TECHNIQUES, THEMES, type CallDetail, type CallStatus,
} from '@portfolio/schemas';
import { CALL_LIMITS, parseCallForm, type CallFormErrors } from '@/lib/call-form';
import { CALL_STATUS_LABELS, callTypeLabel, capitalize, techniqueLabel, themeLabel } from '@/lib/format';
import { saveCall, type CallFormState } from '../actions';
import styles from './CallForm.module.css';

const STATUS_HELP: Record<CallStatus, string> = {
  borrador: 'Solo la ve tu equipo. Puedes prepararla con calma.',
  abierta: 'Visible para las artistas y abierta a solicitudes.',
  cerrada: 'Ya no admite solicitudes; sigues revisando candidaturas.',
  resuelta: 'Proceso terminado y resultado comunicado.',
};

interface Row { key: number; date?: string; text: string }
let seq = 0;
const nextKey = () => ++seq;

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <p id={id} className="field-error">{error}</p> : null;
}

/** Formulario de convocatoria (crear y editar), validado con el esquema Zod compartido. */
export function CallForm({ call }: { call?: CallDetail }) {
  const mode = call ? 'update' : 'create';
  const [state, action, pending] = useActionState<CallFormState, FormData>(saveCall.bind(null, call?.id ?? null), {});
  const [clientErrors, setClientErrors] = useState<CallFormErrors | null>(null);
  const errors = clientErrors ?? state.errors ?? {};
  const uid = useId();
  const fid = (k: string) => `${uid}-${k}`;

  const [timeline, setTimeline] = useState<Row[]>(() =>
    (call?.timeline.length ? call.timeline : [{ date: '', text: 'Cierre de solicitudes' }]).map((t) => ({ key: nextKey(), date: t.date, text: t.text })),
  );
  const [requirements, setRequirements] = useState<Row[]>(() =>
    (call?.requirements.length ? call.requirements : ['']).map((text) => ({ key: nextKey(), text })),
  );

  /**
   * Valida en el navegador con el mismo esquema que usa el servidor y, si todo está bien, lanza la
   * Server Action a mano (sin el reseteo automático del formulario de React, para no perder lo escrito
   * si la API rechaza algo).
   */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = parseCallForm(fd, mode);
    if (!parsed.success) {
      setClientErrors(parsed.errors);
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setClientErrors(null);
    startTransition(() => action(fd));
  }

  const invalid = (k: string) => (errors[k] ? true : undefined);
  const describedBy = (k: string, hint?: boolean) =>
    [errors[k] ? `${fid(k)}-error` : null, hint ? `${fid(k)}-hint` : null].filter(Boolean).join(' ') || undefined;

  const closesAt = call?.closesAt?.slice(0, 10) ?? '';
  const message = clientErrors ? 'Revisa los campos marcados.' : state.message;

  return (
    <form action={action} onSubmit={onSubmit} className={styles.form} noValidate aria-describedby={message ? `${uid}-msg` : undefined}>
      {message && <p id={`${uid}-msg`} className="form-alert" role="alert">{message}</p>}

      <section className={styles.section} aria-labelledby={fid('s1')}>
        <h2 id={fid('s1')} className={styles.sectionTitle}>Lo esencial</h2>
        <div className={styles.cols}>
          <div className="field">
            <label htmlFor={fid('type')}>Tipo</label>
            <select id={fid('type')} name="type" className="select" defaultValue={call?.type ?? 'exposicion'} aria-invalid={invalid('type')} aria-describedby={describedBy('type')}>
              {CALL_TYPES.map((t) => <option key={t} value={t}>{capitalize(callTypeLabel(t))}</option>)}
            </select>
            <FieldError id={`${fid('type')}-error`} error={errors.type} />
          </div>
          <div className="field">
            <label htmlFor={fid('scope')}>Ámbito</label>
            <select id={fid('scope')} name="scope" className="select" defaultValue={call?.scope ?? 'regional'} aria-invalid={invalid('scope')} aria-describedby={describedBy('scope')}>
              {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
            </select>
            <FieldError id={`${fid('scope')}-error`} error={errors.scope} />
          </div>
          <div className="field">
            <label htmlFor={fid('edition')}>Edición <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('edition')} name="edition" className="input" defaultValue={call?.edition ?? ''} maxLength={CALL_LIMITS.edition} placeholder="p. ej. 2027 o III edición" aria-invalid={invalid('edition')} aria-describedby={describedBy('edition')} />
            <FieldError id={`${fid('edition')}-error`} error={errors.edition} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={fid('title')}>Título</label>
          <input id={fid('title')} name="title" className="input" required minLength={3} maxLength={CALL_LIMITS.title} defaultValue={call?.title ?? ''} aria-invalid={invalid('title')} aria-describedby={describedBy('title')} />
          <FieldError id={`${fid('title')}-error`} error={errors.title} />
        </div>
        <div className="field">
          <label htmlFor={fid('summary')}>Resumen <span style={{ fontWeight: 500 }}>(opcional)</span></label>
          <textarea id={fid('summary')} name="summary" className="textarea" rows={3} maxLength={CALL_LIMITS.summary} defaultValue={call?.summary ?? ''} aria-invalid={invalid('summary')} aria-describedby={describedBy('summary', true)} />
          <p id={`${fid('summary')}-hint`} className="hint">Qué buscáis y qué ofrecéis, en dos o tres frases (máximo {CALL_LIMITS.summary} caracteres).</p>
          <FieldError id={`${fid('summary')}-error`} error={errors.summary} />
        </div>
        <div className={styles.cols}>
          <div className="field">
            <label htmlFor={fid('closesAt')}>Cierre de solicitudes</label>
            <input id={fid('closesAt')} name="closesAt" type="date" className="input" required defaultValue={closesAt} aria-invalid={invalid('closesAt')} aria-describedby={describedBy('closesAt')} />
            <FieldError id={`${fid('closesAt')}-error`} error={errors.closesAt} />
          </div>
          <div className="field">
            <label htmlFor={fid('city')}>Ciudad <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('city')} name="city" className="input" maxLength={CALL_LIMITS.city} defaultValue={call?.city ?? ''} aria-invalid={invalid('city')} aria-describedby={describedBy('city')} />
            <FieldError id={`${fid('city')}-error`} error={errors.city} />
          </div>
          <div className="field">
            <label htmlFor={fid('places')}>Plazas <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('places')} name="places" type="number" inputMode="numeric" min={1} max={500} className="input" defaultValue={call?.places ?? ''} aria-invalid={invalid('places')} aria-describedby={describedBy('places')} />
            <FieldError id={`${fid('places')}-error`} error={errors.places} />
          </div>
          <div className="field">
            <label htmlFor={fid('prize')}>Dotación <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('prize')} name="prize" className="input" maxLength={CALL_LIMITS.prize} placeholder="p. ej. 3.000 €" defaultValue={call?.prize ?? ''} aria-invalid={invalid('prize')} aria-describedby={describedBy('prize')} />
            <FieldError id={`${fid('prize')}-error`} error={errors.prize} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={fid('basesUrl')}>Enlace a las bases <span style={{ fontWeight: 500 }}>(opcional)</span></label>
          <input id={fid('basesUrl')} name="basesUrl" type="url" inputMode="url" className="input" placeholder="https://…" defaultValue={call?.basesUrl ?? ''} aria-invalid={invalid('basesUrl')} aria-describedby={describedBy('basesUrl')} />
          <FieldError id={`${fid('basesUrl')}-error`} error={errors.basesUrl} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby={fid('s2')}>
        <h2 id={fid('s2')} className={styles.sectionTitle}>Qué obra buscáis</h2>
        <p className={styles.sectionHint}>se usa para calcular el encaje con cada artista</p>
        <fieldset aria-invalid={invalid('techniques')} aria-describedby={describedBy('techniques')}>
          <legend>Técnicas</legend>
          <div className={styles.checks}>
            {TECHNIQUES.map((t) => (
              <label key={t} className="check-chip">
                <input type="checkbox" name="techniques" value={t} defaultChecked={call?.techniques.includes(t)} />
                <span>{techniqueLabel(t)}</span>
              </label>
            ))}
          </div>
          <FieldError id={`${fid('techniques')}-error`} error={errors.techniques} />
        </fieldset>
        <fieldset aria-invalid={invalid('themes')} aria-describedby={describedBy('themes')}>
          <legend>Temas</legend>
          <div className={styles.checks}>
            {THEMES.map((t) => (
              <label key={t} className="check-chip">
                <input type="checkbox" name="themes" value={t} defaultChecked={call?.themes.includes(t)} />
                <span>{themeLabel(t)}</span>
              </label>
            ))}
          </div>
          <FieldError id={`${fid('themes')}-error`} error={errors.themes} />
        </fieldset>
        <div className={styles.cols}>
          <div className="field">
            <label htmlFor={fid('maxArtworks')}>Obras por solicitud</label>
            <input id={fid('maxArtworks')} name="maxArtworks" type="number" min={1} max={10} className="input" defaultValue={call?.maxArtworks ?? 3} aria-invalid={invalid('maxArtworks')} aria-describedby={describedBy('maxArtworks')} />
            <FieldError id={`${fid('maxArtworks')}-error`} error={errors.maxArtworks} />
          </div>
          <div className="field">
            <label htmlFor={fid('maxFormatCm')}>Lado máximo (cm) <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('maxFormatCm')} name="maxFormatCm" type="number" min={1} max={1000} className="input" defaultValue={call?.maxFormatCm ?? ''} aria-invalid={invalid('maxFormatCm')} aria-describedby={describedBy('maxFormatCm')} />
            <FieldError id={`${fid('maxFormatCm')}-error`} error={errors.maxFormatCm} />
          </div>
          <div className="field">
            <label htmlFor={fid('minYear')}>Obra desde el año <span style={{ fontWeight: 500 }}>(opcional)</span></label>
            <input id={fid('minYear')} name="minYear" type="number" min={1900} max={2100} className="input" defaultValue={call?.minYear ?? ''} aria-invalid={invalid('minYear')} aria-describedby={describedBy('minYear')} />
            <FieldError id={`${fid('minYear')}-error`} error={errors.minYear} />
          </div>
        </div>
        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input type="checkbox" name="requiresCv" defaultChecked={call?.requiresCv ?? true} /> Pedir CV artístico
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" name="requiresDossier" defaultChecked={call?.requiresDossier ?? true} /> Pedir dossier
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={fid('s3')}>
        <h2 id={fid('s3')} className={styles.sectionTitle}>Requisitos</h2>
        <p className={styles.sectionHint}>una línea por requisito, hasta {CALL_LIMITS.rows}</p>
        {requirements.map((r, i) => (
          <div key={r.key} className={styles.rowSingle}>
            <label className="visually-hidden" htmlFor={fid(`req-${r.key}`)}>Requisito {i + 1}</label>
            <input
              id={fid(`req-${r.key}`)}
              name="requirements"
              className="input"
              maxLength={CALL_LIMITS.requirement}
              defaultValue={r.text}
              aria-invalid={invalid(`requirements.${i}`)}
              placeholder="p. ej. Obra disponible para exposición"
            />
            <button type="button" className={styles.remove} aria-label={`Quitar el requisito ${i + 1}`} onClick={() => setRequirements((rows) => rows.filter((x) => x.key !== r.key))}>×</button>
          </div>
        ))}
        <FieldError id={`${fid('requirements')}-error`} error={errors.requirements} />
        <div>
          <button type="button" className="btn btn-sm" disabled={requirements.length >= CALL_LIMITS.rows} onClick={() => setRequirements((rows) => [...rows, { key: nextKey(), text: '' }])}>
            + Añadir requisito
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={fid('s4')}>
        <h2 id={fid('s4')} className={styles.sectionTitle}>Calendario</h2>
        <p className={styles.sectionHint}>fecha (o mes) y qué ocurre</p>
        {timeline.map((t, i) => (
          <div key={t.key} className={styles.row}>
            <div>
              <label className="visually-hidden" htmlFor={fid(`tl-d-${t.key}`)}>Fecha del hito {i + 1}</label>
              <input id={fid(`tl-d-${t.key}`)} name="timelineDate" className="input" maxLength={CALL_LIMITS.milestoneDate} defaultValue={t.date} placeholder="2026-11-30 o «enero»" aria-invalid={invalid(`timeline.${i}.date`)} />
            </div>
            <div>
              <label className="visually-hidden" htmlFor={fid(`tl-t-${t.key}`)}>Descripción del hito {i + 1}</label>
              <input id={fid(`tl-t-${t.key}`)} name="timelineText" className="input" maxLength={CALL_LIMITS.milestoneText} defaultValue={t.text} placeholder="Qué ocurre" aria-invalid={invalid(`timeline.${i}.text`)} />
            </div>
            <button type="button" className={styles.remove} aria-label={`Quitar el hito ${i + 1}`} onClick={() => setTimeline((rows) => rows.filter((x) => x.key !== t.key))}>×</button>
          </div>
        ))}
        <FieldError id={`${fid('timeline')}-error`} error={errors.timeline} />
        <div>
          <button type="button" className="btn btn-sm" disabled={timeline.length >= CALL_LIMITS.rows} onClick={() => setTimeline((rows) => [...rows, { key: nextKey(), date: '', text: '' }])}>
            + Añadir hito
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={fid('s5')}>
        <h2 id={fid('s5')} className={styles.sectionTitle}>Estado</h2>
        <fieldset aria-describedby={describedBy('status')}>
          <legend className="visually-hidden">Estado de la convocatoria</legend>
          <div className={styles.statusGrid}>
            {CALL_STATUS.map((s) => (
              <label key={s} className={styles.statusOption}>
                <input type="radio" name="status" value={s} defaultChecked={(call?.status ?? 'borrador') === s} />
                <span>
                  <strong>{capitalize(CALL_STATUS_LABELS[s])}</strong>
                  <small>{STATUS_HELP[s]}</small>
                </span>
              </label>
            ))}
          </div>
          <FieldError id={`${fid('status')}-error`} error={errors.status} />
        </fieldset>
      </section>

      <div className={styles.footer}>
        <Link href={call ? `/panel/convocatorias/${call.id}` : '/panel/convocatorias'} className="btn btn-white">Cancelar</Link>
        <button type="submit" className="btn btn-cobalt" disabled={pending}>
          {pending ? 'Guardando…' : call ? 'Guardar cambios' : 'Guardar convocatoria'}
        </button>
      </div>
    </form>
  );
}

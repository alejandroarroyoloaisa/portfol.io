import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ApplicationStatus, OrgApplicationRow } from '@portfolio/schemas';
import { ProtectedImage } from '@/components/ProtectedImage';
import { StatusChip } from '@/components/StatusChip';
import { CALL_STATUS_LABELS, capitalize, fmtDate, fmtNumber, plural, techniqueLabel } from '@/lib/format';
import { panelFetchOrNull } from '@/lib/session';
import { FilterChips } from '../../components/FilterChips';
import { StatusActions } from '../../components/StatusActions';
import styles from '../../panel.module.css';
import own from './call.module.css';

export const metadata: Metadata = { title: 'Candidaturas' };

/** Filtros del panel (W2). «Pendientes» agrupa enviadas y en revisión. */
const FILTERS = [
  { key: 'todas', label: 'Todas', statuses: null },
  { key: 'pendientes', label: 'Pendientes', statuses: ['enviada', 'en_revision'] },
  { key: 'preseleccionada', label: 'Preseleccionadas', statuses: ['preseleccionada'] },
  { key: 'aceptada', label: 'Aceptadas', statuses: ['aceptada'] },
  { key: 'no_seleccionada', label: 'Descartadas', statuses: ['no_seleccionada'] },
  { key: 'retirada', label: 'Retiradas', statuses: ['retirada'] },
] as const satisfies readonly { key: string; label: string; statuses: readonly ApplicationStatus[] | null }[];

type SortKey = 'encaje' | 'recientes' | 'nombre';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'encaje', label: 'encaje' },
  { key: 'recientes', label: 'más recientes' },
  { key: 'nombre', label: 'nombre' },
];

function sortRows(rows: OrgApplicationRow[], sort: SortKey) {
  const copy = [...rows];
  if (sort === 'nombre') return copy.sort((a, b) => a.artist.name.localeCompare(b.artist.name, 'es'));
  if (sort === 'recientes') return copy.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
  return copy.sort((a, b) => (b.match ?? -1) - (a.match ?? -1));
}

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function CallApplicationsPage({ params, searchParams }: PageProps<'/panel/convocatorias/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const filter = FILTERS.find((f) => f.key === str(sp.estado)) ?? FILTERS[0];
  const q = str(sp.q)?.trim().slice(0, 80) ?? '';
  const sort: SortKey = SORTS.some((s) => s.key === sp.orden) ? (sp.orden as SortKey) : 'encaje';
  const saved = str(sp.guardada);
  const here = `/panel/convocatorias/${id}`;

  // Una sola petición filtrada por la API cuando el filtro es un único estado; «pendientes» se filtra aquí.
  const apiStatus = filter.statuses?.length === 1 ? filter.statuses[0] : undefined;
  const [call, all, filtered] = await Promise.all([
    panelFetchOrNull((api) => api.calls.get(id), here),
    panelFetchOrNull((api) => api.calls.applications(id), here),
    filter.key === 'todas' && !q ? null : panelFetchOrNull((api) => api.calls.applications(id, { status: apiStatus, q: q || undefined }), here),
  ]);
  if (!call || !all) notFound();

  let rows = filtered ?? all;
  if (filter.statuses && filter.statuses.length > 1) rows = rows.filter((r) => (filter.statuses as readonly string[]).includes(r.status));
  rows = sortRows(rows, sort);

  const by = (s: ApplicationStatus) => all.filter((r) => r.status === s).length;
  const pending = by('enviada') + by('en_revision');
  const shortlisted = by('preseleccionada') + by('aceptada');

  const link = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { estado: filter.key === 'todas' ? undefined : filter.key, q: q || undefined, orden: sort === 'encaje' ? undefined : sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${here}?${s}` : here;
  };

  const counts: Record<string, number> = {
    todas: all.length, pendientes: pending, preseleccionada: by('preseleccionada'), aceptada: by('aceptada'),
    no_seleccionada: by('no_seleccionada'), retirada: by('retirada'),
  };

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={`hand ${styles.kicker}`}>
            convocatoria {CALL_STATUS_LABELS[call.status]} · {call.daysLeft >= 0 ? `cierra el ${fmtDate(call.closesAt)}` : `cerró el ${fmtDate(call.closesAt)}`}
          </p>
          <h1 className={styles.h1}>{call.title}</h1>
        </div>
        <div className={styles.headActions}>
          <Link href={`${here}/editar`} className="btn btn-white">Editar convocatoria</Link>
          <a href={`${here}/exportar`} className="btn btn-cobalt" download>Exportar selección</a>
        </div>
      </div>

      {saved && (
        <p className={`form-ok ${styles.flash}`} role="status">
          {saved === 'creada' ? 'Convocatoria creada.' : 'Cambios guardados.'}
          {call.status === 'borrador' ? ' Está en borrador: no es visible para las artistas hasta que la abras.' : ''}
        </p>
      )}

      <dl className={styles.statGrid}>
        <div className={styles.stat}>
          <dt>candidaturas recibidas</dt>
          <dd>{fmtNumber(all.length)}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-verde)', color: 'var(--c-crema)' }}>
          <dt>{call.places ? 'plazas preseleccionadas' : 'preseleccionadas'}</dt>
          <dd>{call.places ? `${shortlisted} / ${call.places}` : shortlisted}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-mostaza)' }}>
          <dt>pendientes de revisar</dt>
          <dd>{fmtNumber(pending)}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-coral)' }}>
          <dt>{call.daysLeft >= 0 ? (call.daysLeft === 1 ? 'día para el cierre' : 'días para el cierre') : 'plazo cerrado'}</dt>
          <dd>{call.daysLeft >= 0 ? call.daysLeft : '—'}</dd>
        </div>
      </dl>

      <section className={styles.card} aria-labelledby="candidaturas-titulo">
        <div className={styles.cardHead}>
          <h2 id="candidaturas-titulo" className={styles.h2}>Candidaturas</h2>
          <FilterChips
            label="Filtrar candidaturas por estado"
            current={filter.key}
            items={FILTERS.filter((f) => f.key !== 'retirada' || counts.retirada > 0).map((f) => ({
              key: f.key, label: f.label, href: link({ estado: f.key === 'todas' ? undefined : f.key }), count: counts[f.key],
            }))}
          />
        </div>

        <div className={own.toolbar}>
          <form method="get" action={here} className={own.search} role="search">
            {filter.key !== 'todas' && <input type="hidden" name="estado" value={filter.key} />}
            {sort !== 'encaje' && <input type="hidden" name="orden" value={sort} />}
            <label htmlFor="buscar" className="visually-hidden">Buscar por nombre de artista</label>
            <input id="buscar" name="q" type="search" className="input" placeholder="Buscar artista…" defaultValue={q} />
            <button type="submit" className="btn btn-sm btn-ink">Buscar</button>
            {q && <Link href={link({ q: undefined })} className="btn btn-sm">Quitar búsqueda</Link>}
          </form>
          <div className={own.sort}>
            <span>Ordenar por:</span>
            {SORTS.map((s) => (
              <Link key={s.key} href={link({ orden: s.key === 'encaje' ? undefined : s.key })} aria-current={sort === s.key ? 'true' : undefined} scroll={false}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <p className={own.count} aria-live="polite">
          {plural(rows.length, 'candidatura', 'candidaturas')}
          {q ? ` para «${q}»` : ''}
        </p>

        {rows.length > 0 && (
          <div className={own.tableWrap}>
            <table className={own.table}>
              <caption className="visually-hidden">Candidaturas de {call.title}</caption>
              <thead>
                <tr>
                  <th scope="col">obra</th>
                  <th scope="col">artista</th>
                  <th scope="col">técnica</th>
                  <th scope="col">ciudad</th>
                  <th scope="col">encaje</th>
                  <th scope="col">estado</th>
                  <th scope="col">acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const first = r.artworks[0];
                  const techniques = Array.from(new Set(r.artworks.map((a) => techniqueLabel(a.technique))));
                  return (
                    <tr key={r.id}>
                      <td className={own.thumbsCell}>
                        <Link href={`${here}/solicitudes/${r.id}`} className={own.thumbs} aria-label={`Ver la solicitud de ${r.artist.name} (${r.artworks.length} obras)`}>
                          {r.artworks.slice(0, 3).map((a) => (
                            <span key={a.id} className={own.thumb} style={{ background: a.images[0]?.color }}>
                              {a.images[0] && <ProtectedImage image={a.images[0]} alt="" variant="thumb" fill sizes="56px" />}
                            </span>
                          ))}
                        </Link>
                      </td>
                      <td className={own.artistCell}>
                        <Link href={`${here}/solicitudes/${r.id}`} className={own.artist}>{r.artist.name}</Link>
                        <div className={own.sub}>{first ? first.title : 'sin obras'}{r.artworks.length > 1 ? ` y ${r.artworks.length - 1} más` : ''}</div>
                      </td>
                      <td data-label="técnica">{techniques.length ? capitalize(techniques.join(', ')) : '—'}</td>
                      <td data-label="ciudad">{r.artist.city ?? '—'}</td>
                      <td data-label="encaje">
                        {r.match !== null ? (
                          <div className={own.match}>
                            <span className={own.matchBar} aria-hidden="true"><span style={{ width: `${r.match}%` }} /></span>
                            <strong>{r.match} %</strong>
                          </div>
                        ) : '—'}
                      </td>
                      <td data-label="estado"><StatusChip status={r.status} /></td>
                      <td className={own.actionsCell}>
                        <StatusActions callId={id} applicationId={r.id} status={r.status} artistName={r.artist.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length === 0 && (
          <p className={styles.empty}>{q ? 'ninguna candidatura coincide con la búsqueda' : 'no hay candidaturas en este estado'}</p>
        )}
      </section>
    </>
  );
}

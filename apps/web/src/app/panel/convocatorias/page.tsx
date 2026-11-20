import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CALL_STATUS, type CallStatus } from '@portfolio/schemas';
import { closingText } from '@/components/CallCard';
import { CALL_STATUS_LABELS, callTypeLabel, capitalize } from '@/lib/format';
import { getDashboard } from '@/lib/session';
import { CallStatusBar } from '../components/CallStatusBar';
import { CallStatusChip } from '../components/CallStatusChip';
import { FilterChips } from '../components/FilterChips';
import styles from '../panel.module.css';

export const metadata: Metadata = { title: 'Convocatorias' };

export default async function PanelCalls({ searchParams }: PageProps<'/panel/convocatorias'>) {
  const dashboard = await getDashboard();
  if (!dashboard) notFound();
  const { estado } = await searchParams;
  const status = typeof estado === 'string' && (CALL_STATUS as readonly string[]).includes(estado) ? (estado as CallStatus) : null;
  const calls = status ? dashboard.calls.filter((c) => c.status === status) : dashboard.calls;
  const count = (s: CallStatus) => dashboard.calls.filter((c) => c.status === s).length;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={`hand ${styles.kicker}`}>{dashboard.organization.name}</p>
          <h1 className={styles.h1}>Convocatorias</h1>
        </div>
        <div className={styles.headActions}>
          <Link href="/panel/convocatorias/nueva" className="btn btn-cobalt">Nueva convocatoria</Link>
        </div>
      </div>

      <section className={styles.card} aria-labelledby="listado-titulo">
        <div className={styles.cardHead}>
          <h2 id="listado-titulo" className={styles.h2}>Todas tus convocatorias</h2>
          <FilterChips
            label="Filtrar por estado de la convocatoria"
            current={status ?? 'todas'}
            items={[
              { key: 'todas', label: 'Todas', href: '/panel/convocatorias', count: dashboard.calls.length },
              ...CALL_STATUS.map((s) => ({ key: s, label: capitalize(CALL_STATUS_LABELS[s]) + (s === 'borrador' ? 'es' : 's'), href: `/panel/convocatorias?estado=${s}`, count: count(s) })),
            ]}
          />
        </div>
        {calls.length === 0 ? (
          <p className={styles.empty}>no hay convocatorias en este estado</p>
        ) : (
          <ul className={styles.callList}>
            {calls.map((c) => (
              <li key={c.id} className={styles.callRow}>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <Link href={`/panel/convocatorias/${c.id}`} className={styles.callTitle}>{c.title}</Link>
                    <CallStatusChip status={c.status} />
                  </div>
                  <p className={styles.callMeta}>
                    {capitalize(callTypeLabel(c.type))}
                    {c.city ? ` · ${c.city}` : ''} · {closingText(c)} · {c.applicationsCount} {c.applicationsCount === 1 ? 'candidatura' : 'candidaturas'}
                  </p>
                  <CallStatusBar byStatus={c.byStatus} total={c.applicationsCount} />
                </div>
                <div className={styles.rowActions}>
                  <Link href={`/panel/convocatorias/${c.id}`} className="btn btn-sm btn-ink">Revisar</Link>
                  <Link href={`/panel/convocatorias/${c.id}/editar`} className="btn btn-sm">Editar</Link>
                  {c.status !== 'borrador' && (
                    <Link href={`/convocatorias/${c.id}`} className="btn btn-sm">Página pública</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

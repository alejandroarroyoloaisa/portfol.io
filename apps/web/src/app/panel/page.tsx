import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { closingText } from '@/components/CallCard';
import { callTypeLabel, capitalize, firstName, fmtNumber } from '@/lib/format';
import { getDashboard, getMe } from '@/lib/session';
import { CallStatusBar } from './components/CallStatusBar';
import { CallStatusChip } from './components/CallStatusChip';
import styles from './panel.module.css';

export const metadata: Metadata = { title: 'Resumen' };

export default async function PanelHome() {
  const [me, dashboard] = await Promise.all([getMe(), getDashboard()]);
  if (!dashboard) notFound();
  const calls = dashboard.calls;
  const sum = (pick: (c: (typeof calls)[number]) => number) => calls.reduce((n, c) => n + pick(c), 0);
  const received = sum((c) => c.applicationsCount);
  const pending = sum((c) => (c.byStatus.enviada ?? 0) + (c.byStatus.en_revision ?? 0));
  const shortlisted = sum((c) => (c.byStatus.preseleccionada ?? 0) + (c.byStatus.aceptada ?? 0));
  const open = calls.filter((c) => c.status === 'abierta').length;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={`hand ${styles.kicker}`}>
            {me.id === dashboard.organization.id ? 'resumen de la cuenta' : `${dashboard.organization.name} · resumen`}
          </p>
          <h1 className={styles.h1}>{me.id === dashboard.organization.id ? dashboard.organization.name : `Hola, ${firstName(me.name)}`}</h1>
        </div>
        <div className={styles.headActions}>
          <Link href="/panel/convocatorias/nueva" className="btn btn-cobalt">Nueva convocatoria</Link>
        </div>
      </div>

      <dl className={styles.statGrid}>
        <div className={styles.stat}>
          <dt>convocatorias abiertas</dt>
          <dd>{fmtNumber(open)}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-mostaza)' }}>
          <dt>candidaturas por revisar</dt>
          <dd>{fmtNumber(pending)}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-verde)', color: 'var(--c-crema)' }}>
          <dt>preseleccionadas o aceptadas</dt>
          <dd>{fmtNumber(shortlisted)}</dd>
        </div>
        <div className={styles.stat} style={{ background: 'var(--c-coral)' }}>
          <dt>candidaturas recibidas</dt>
          <dd>{fmtNumber(received)}</dd>
        </div>
      </dl>

      <section className={styles.card} aria-labelledby="convocatorias-titulo">
        <div className={styles.cardHead}>
          <h2 id="convocatorias-titulo" className={styles.h2}>Tus convocatorias</h2>
          <Link href="/panel/convocatorias" className="btn btn-sm">Ver todas</Link>
        </div>
        {calls.length === 0 ? (
          <p className={styles.empty}>todavía no has publicado ninguna convocatoria</p>
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
                    {capitalize(callTypeLabel(c.type))} · {closingText(c)} · {c.applicationsCount} {c.applicationsCount === 1 ? 'candidatura' : 'candidaturas'}
                  </p>
                  <CallStatusBar byStatus={c.byStatus} total={c.applicationsCount} />
                </div>
                <div className={styles.rowActions}>
                  <Link href={`/panel/convocatorias/${c.id}`} className="btn btn-sm btn-ink">Revisar candidaturas</Link>
                  <Link href={`/panel/convocatorias/${c.id}/editar`} className="btn btn-sm">Editar</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

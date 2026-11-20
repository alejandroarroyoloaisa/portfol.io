import type { Metadata } from 'next';
import Link from 'next/link';
import { CALL_TYPES, type CallSummary, type CallType } from '@portfolio/schemas';
import { CallCard } from '@/components/CallCard';
import { orFallback, publicApi } from '@/lib/api';
import { callTypeLabel, capitalize, plural } from '@/lib/format';
import styles from './calls.module.css';

export const metadata: Metadata = {
  title: 'Convocatorias abiertas para artistas',
  description: 'Premios, exposiciones colectivas, residencias, becas y ferias para pintoras y pintores, publicadas por galerías e instituciones en Portfol.io.',
  alternates: { canonical: '/convocatorias' },
};

const TYPE_PLURALS: Record<CallType, string> = {
  premio: 'Premios', exposicion: 'Exposiciones', residencia: 'Residencias', beca: 'Becas', feria: 'Ferias',
};

export default async function CallsPage({ searchParams }: PageProps<'/convocatorias'>) {
  const { tipo } = await searchParams;
  const type = typeof tipo === 'string' && (CALL_TYPES as readonly string[]).includes(tipo) ? (tipo as CallType) : undefined;
  const calls = await orFallback(publicApi().calls.list(type ? { type } : undefined), [] as CallSummary[]);
  const open = calls.filter((c) => c.status === 'abierta').sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <>
      <header className={`container ${styles.head}`}>
        <p className={`hand ${styles.kicker}`}>premios, becas, residencias y expos</p>
        <h1 className={styles.title}>Convocatorias abiertas</h1>
        <p className={styles.lead}>
          Las publican galerías e instituciones en Portfol.io. Desde la app verás cuánto encajan con tu obra y podrás
          presentar tu solicitud con tus piezas del cuaderno.
        </p>
        <nav aria-label="Filtrar por tipo">
          <ul className={styles.filters}>
            <li>
              <Link href="/convocatorias" className={styles.filter} aria-current={!type ? 'page' : undefined}>Todas</Link>
            </li>
            {CALL_TYPES.map((t) => (
              <li key={t}>
                <Link href={`/convocatorias?tipo=${t}`} className={styles.filter} aria-current={type === t ? 'page' : undefined}>
                  {TYPE_PLURALS[t]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <section className={`container ${styles.list}`} aria-label="Listado">
        <p className="hand" style={{ fontSize: 22, marginTop: 18 }} aria-live="polite">
          {plural(open.length, 'convocatoria', 'convocatorias')}
          {type ? ` · ${capitalize(callTypeLabel(type))}` : ''}
        </p>
        {open.length ? (
          <ul className="call-grid">
            {open.map((c, i) => (
              <li key={c.id}>
                <CallCard call={c} index={i} showOrg />
              </li>
            ))}
          </ul>
        ) : (
          <p className={`hand ${styles.empty}`}>no hay convocatorias abiertas de este tipo ahora mismo</p>
        )}
      </section>
    </>
  );
}

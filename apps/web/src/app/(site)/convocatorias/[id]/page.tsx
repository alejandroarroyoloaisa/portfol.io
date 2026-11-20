import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SCOPE_LABELS } from '@portfolio/schemas';
import { Avatar } from '@/components/Avatar';
import { closingText } from '@/components/CallCard';
import { Tape } from '@/components/Decor';
import { JsonLd } from '@/components/JsonLd';
import { getCall } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { callTypeLabel, capitalize, fmtDate, fmtMilestone, techniqueLabel, themeLabel } from '@/lib/format';
import styles from '../calls.module.css';

export const revalidate = 60;

export function generateStaticParams(): { id: string }[] {
  return [];
}

async function load(id: string) {
  const call = await getCall(id);
  return call && call.status !== 'borrador' ? call : null;
}

export async function generateMetadata({ params }: PageProps<'/convocatorias/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const call = await load(id);
  if (!call) return { title: 'Convocatoria no encontrada', robots: { index: false } };
  const description = call.summary ?? `${capitalize(callTypeLabel(call.type))} de ${call.organization.name}. Cierra el ${fmtDate(call.closesAt, { year: true })}.`;
  return {
    title: `${call.title} · ${call.organization.name}`,
    description,
    alternates: { canonical: `/convocatorias/${call.id}` },
    openGraph: { type: 'article', title: call.title, description },
  };
}

export default async function CallPage({ params }: PageProps<'/convocatorias/[id]'>) {
  const { id } = await params;
  const call = await load(id);
  if (!call) notFound();
  const open = call.status === 'abierta' && call.daysLeft >= 0;

  return (
    <article className={`container ${styles.detail}`}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: call.title,
          description: call.summary ?? undefined,
          url: `${SITE_URL}/convocatorias/${call.id}`,
          endDate: call.closesAt,
          eventStatus: 'https://schema.org/EventScheduled',
          location: call.city ? { '@type': 'Place', name: call.city, address: call.city } : undefined,
          organizer: { '@type': 'Organization', name: call.organization.name, url: `${SITE_URL}/${call.organization.handle}` },
        }}
      />
      <div>
        <nav aria-label="Migas de pan" style={{ fontWeight: 700, marginBottom: 18 }}>
          <Link href="/convocatorias">← Todas las convocatorias</Link>
        </nav>
        <p className={`hand ${styles.kicker}`}>
          {callTypeLabel(call.type)}
          {call.edition ? ` · ${call.edition}` : ''} · {closingText(call)}
        </p>
        <h1 className={styles.title} style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}>{call.title}</h1>
        <Link href={`/${call.organization.handle}`} className={styles.org}>
          <Avatar user={call.organization} size={40} />
          {call.organization.name}
        </Link>
        {call.summary && <p className={styles.summary}>{call.summary}</p>}

        {(call.techniques.length > 0 || call.themes.length > 0) && (
          <div className={styles.block}>
            <h2 className={styles.h2}>Qué buscan</h2>
            <ul className="chips" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {call.techniques.map((t) => <li key={t} className="chip chip-mustard">{techniqueLabel(t)}</li>)}
              {call.themes.map((t) => <li key={t} className="chip chip-outline">{themeLabel(t)}</li>)}
            </ul>
          </div>
        )}

        {call.requirements.length > 0 && (
          <div className={styles.block}>
            <h2 className={styles.h2}>Requisitos</h2>
            <ul className={styles.reqs}>
              {call.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {call.timeline.length > 0 && (
          <div className={styles.block}>
            <h2 className={styles.h2}>Calendario</h2>
            <ol className={styles.timeline}>
              {call.timeline.map((t, i) => (
                <li key={`${t.date}-${i}`}>
                  <p className="hand" style={{ fontSize: 23 }}>{fmtMilestone(t.date)}</p>
                  <p style={{ fontWeight: 800, fontSize: 18 }}>{t.text}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <aside className={styles.facts} aria-label="Datos clave">
        <Tape variant="cream" style={{ top: -12, right: 50, transform: 'rotate(6deg)' }} />
        <p className="hand" style={{ fontSize: 26 }}>{open ? 'abierta' : call.status === 'resuelta' ? 'resuelta' : 'cerrada'}</p>
        <dl>
          <dt>cierre</dt>
          <dd>{fmtDate(call.closesAt, { year: true })}</dd>
          <dt>tipo</dt>
          <dd>{capitalize(callTypeLabel(call.type))}</dd>
          <dt>ámbito</dt>
          <dd>{SCOPE_LABELS[call.scope]}</dd>
          {call.city && (<><dt>ciudad</dt><dd>{call.city}</dd></>)}
          {call.places && (<><dt>plazas</dt><dd>{call.places}</dd></>)}
          {call.prize && (<><dt>dotación</dt><dd>{call.prize}</dd></>)}
          <dt>obras</dt>
          <dd>hasta {call.maxArtworks}{call.maxFormatCm ? ` · lado máx. ${call.maxFormatCm} cm` : ''}</dd>
          {call.minYear && (<><dt>desde</dt><dd>obra de {call.minYear} o posterior</dd></>)}
          <dt>documentos</dt>
          <dd>{[call.requiresCv && 'CV', call.requiresDossier && 'dossier'].filter(Boolean).join(' y ') || 'ninguno'}</dd>
        </dl>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          {open && <Link href="/#descargar" className="btn btn-ink btn-lg">Presentarme desde la app</Link>}
          {call.basesUrl && (
            <a href={call.basesUrl} className="btn btn-lg" target="_blank" rel="noopener noreferrer">Leer las bases</a>
          )}
        </div>
        {open && (
          <p className={styles.applyNote}>
            La solicitud se prepara en la app con obras de tu cuaderno; la galería la revisa desde su panel web.
          </p>
        )}
      </aside>
    </article>
  );
}

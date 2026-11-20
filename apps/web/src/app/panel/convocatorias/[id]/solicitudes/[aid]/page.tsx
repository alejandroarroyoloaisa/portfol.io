import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { ProtectedImage } from '@/components/ProtectedImage';
import { StatusChip } from '@/components/StatusChip';
import { artworkMeta } from '@/components/ArtworkCard';
import { applicationStatusLabel, capitalize, fmtBytes, fmtDate, fmtShortDate, statusColors } from '@/lib/format';
import { panelFetchOrNull } from '@/lib/session';
import { MessageForm } from '../../../../components/MessageForm';
import { StatusActions } from '../../../../components/StatusActions';
import styles from '../../../../panel.module.css';
import own from './application.module.css';

export const metadata: Metadata = { title: 'Solicitud' };

const DOC_KIND = { cv: 'CV', dossier: 'Dossier', otro: 'Documento' } as const;

export default async function ApplicationPage({ params }: PageProps<'/panel/convocatorias/[id]/solicitudes/[aid]'>) {
  const { id, aid } = await params;
  const here = `/panel/convocatorias/${id}/solicitudes/${aid}`;
  const app = await panelFetchOrNull((api) => api.calls.application(id, aid), here);
  if (!app) notFound();
  const { artist } = app;
  const history = [...app.history].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <Link href={`/panel/convocatorias/${id}`} className={own.back}>← Volver a {app.call.title}</Link>

      <div className={styles.pageHead}>
        <div className={own.who}>
          <Avatar user={artist} size={64} />
          <div>
            <p className={`hand ${styles.kicker}`}>
              solicitud {app.submittedAt ? `enviada el ${fmtDate(app.submittedAt)}` : 'sin enviar'}
            </p>
            <h1 className={styles.h1}>{artist.name}</h1>
          </div>
        </div>
        <div className={styles.headActions}>
          <Link href={`/${artist.handle}`} className="btn btn-white" target="_blank" rel="noopener">Ver portfolio público</Link>
        </div>
      </div>
      <div className={own.meta}>
        <StatusChip status={app.status} size="md" />
        {app.match !== null && <span>encaje {app.match} %</span>}
        {artist.headline && <span>{artist.headline}</span>}
        {artist.city && <span>{artist.city}</span>}
      </div>

      <div className={own.grid}>
        <div>
          <section className={styles.card} aria-labelledby="carta-titulo">
            <h2 id="carta-titulo" className={styles.h2}>Carta de presentación</h2>
            {app.letter ? <p className={own.letter}>{app.letter}</p> : <p className={styles.empty}>la artista no ha escrito carta</p>}
          </section>

          <section className={styles.card} aria-labelledby="obras-titulo">
            <h2 id="obras-titulo" className={styles.h2}>Obras presentadas ({app.artworks.length})</h2>
            <ul className={own.works}>
              {app.artworks.map((a) => (
                <li key={a.id}>
                  <a href={`/${a.artist.handle}/obra/${a.id}`} target="_blank" rel="noopener" className={own.work}>
                    <span className={own.workImg} style={{ display: 'block', background: a.images[0]?.color }}>
                      {a.images[0] && <ProtectedImage image={a.images[0]} alt={a.title} fill sizes="240px" />}
                    </span>
                    <span className={own.workTitle}>{a.title}</span>
                    <span className={own.workMeta}>{artworkMeta(a)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="docs-titulo">
            <h2 id="docs-titulo" className={styles.h2}>Documentos</h2>
            {app.documents.length === 0 ? (
              <p className={styles.empty}>no ha adjuntado documentos</p>
            ) : (
              <ul className={own.docs}>
                {app.documents.map((d) => (
                  <li key={d.key} className={own.doc}>
                    <span>
                      <span className={own.docKind}>{DOC_KIND[d.kind]}</span>
                      {d.name} <span style={{ fontWeight: 500 }}>· {fmtBytes(d.sizeBytes)}</span>
                    </span>
                    {d.url ? (
                      <a href={d.url} className="btn btn-sm" target="_blank" rel="noopener noreferrer">Abrir PDF</a>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500 }}>enlace no disponible</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className={styles.card} aria-labelledby="estado-titulo">
            <h2 id="estado-titulo" className={styles.h2}>Decisión</h2>
            <p style={{ margin: '8px 0 14px' }}>
              Estado actual: <strong>{applicationStatusLabel(app.status)}</strong>
            </p>
            <StatusActions callId={id} applicationId={aid} status={app.status} artistName={artist.name} size="md" />
            {app.feedback && (
              <p className={own.note} style={{ marginTop: 14 }}>
                <strong>Última nota a la artista:</strong> {app.feedback}
              </p>
            )}
          </section>

          <section className={styles.card} aria-labelledby="historial-titulo">
            <h2 id="historial-titulo" className={styles.h2}>Historial</h2>
            <ol className={own.history}>
              {history.map((h, i) => (
                <li key={`${h.at}-${i}`}>
                  <span aria-hidden="true" className={own.dot} style={{ background: statusColors(h.status).bg }} />
                  <p className={own.when}>{fmtShortDate(h.at)} · {h.by === artist.id ? 'la artista' : 'la organización'}</p>
                  <p style={{ fontWeight: 800 }}>{capitalize(applicationStatusLabel(h.status))}</p>
                  {h.note && <p className={own.note}>{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.card} aria-labelledby="mensaje-titulo">
            <h2 id="mensaje-titulo" className={styles.h2}>Escribir a la artista</h2>
            <div style={{ marginTop: 12 }}>
              <MessageForm
                artistId={artist.id}
                artistName={artist.name}
                callId={id}
                applicationId={aid}
                hasConversation={!!app.conversationId}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

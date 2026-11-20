import Link from 'next/link';
import type { Artwork } from '@portfolio/schemas';
import {
  artworkStatusLabel, capitalize, firstName, fmtDate, fmtNumber, fmtSize, techniqueLabel, themeLabel,
} from '@/lib/format';
import { Blob, Tape } from './Decor';
import { ProtectedImage } from './ProtectedImage';
import styles from './ArtworkDetail.module.css';

/** Ficha técnica de una obra (página completa y modal). */
export function ArtworkDetail({ artwork, headingId, asDialog = false }: { artwork: Artwork; headingId: string; asDialog?: boolean }) {
  const [main, ...rest] = artwork.images;
  const Heading = asDialog ? 'h2' : 'h1';
  const statusChip = artwork.status === 'exposicion' ? 'chip-green' : artwork.status === 'proceso' ? 'chip-mustard' : 'chip-outline';
  return (
    <article className={styles.wrap}>
      <div>
        <div className={styles.stage}>
          <Blob color="var(--c-verde)" className={styles.blob} />
          <div className={styles.cut}>
            {main ? (
              <ProtectedImage image={main} alt={`${artwork.title}, de ${artwork.artist.name}`} variant="large" priority sizes="(max-width: 860px) 92vw, 600px" />
            ) : (
              <div style={{ height: 360, background: 'var(--c-arena)' }} />
            )}
            <Tape variant="coral" style={{ top: -12, left: -14, width: 80, transform: 'rotate(-35deg)' }} />
            <Tape style={{ bottom: -10, right: -12, width: 80, transform: 'rotate(-35deg)' }} />
          </div>
        </div>
        {rest.length > 0 && (
          <div className={styles.more} aria-label="Más imágenes de la obra">
            {rest.map((img, i) => (
              <div key={img.thumb}>
                <ProtectedImage image={img} alt={`${artwork.title}, detalle ${i + 2}`} variant="thumb" fill sizes="84px" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {artwork.series && (
          <p className={`hand ${styles.kicker}`}>
            serie {artwork.series.title}, {artwork.series.position} de {artwork.series.count}
          </p>
        )}
        <Heading id={headingId} className={styles.title}>{artwork.title}</Heading>
        <Link href={`/${artwork.artist.handle}`} className={styles.byline}>
          {artwork.artist.name}, {artwork.year}
        </Link>
        {artwork.annotation && <p className={`hand ${styles.annotation}`}>{artwork.annotation}</p>}

        <div className="chips" style={{ marginTop: 18 }}>
          <span className="chip chip-coral">{techniqueLabel(artwork.technique)}</span>
          <span className="chip chip-mustard">{fmtSize(artwork.widthCm, artwork.heightCm)}</span>
          <span className={`chip ${statusChip}`}>{artworkStatusLabel(artwork.status)}</span>
        </div>

        {artwork.note && <p className={`hand ${styles.note}`}>{artwork.note}</p>}

        <dl className={styles.sheet} aria-label="Ficha técnica">
          <dt>técnica</dt>
          <dd>{capitalize(techniqueLabel(artwork.technique))}</dd>
          <dt>medidas</dt>
          <dd>{fmtSize(artwork.widthCm, artwork.heightCm)} <span style={{ fontWeight: 500 }}>(alto × ancho)</span></dd>
          <dt>año</dt>
          <dd>{artwork.year}</dd>
          {artwork.series && (
            <>
              <dt>serie</dt>
              <dd>«{artwork.series.title}»</dd>
            </>
          )}
          {artwork.themes.length > 0 && (
            <>
              <dt>temas</dt>
              <dd>{artwork.themes.map(themeLabel).join(', ')}</dd>
            </>
          )}
          <dt>estado</dt>
          <dd>{capitalize(artworkStatusLabel(artwork.status))}</dd>
          {artwork.publishedAt && (
            <>
              <dt>publicada</dt>
              <dd>{fmtDate(artwork.publishedAt, { year: true })}</dd>
            </>
          )}
        </dl>

        <p className={styles.stats} aria-label="Actividad">
          <span>{fmtNumber(artwork.views)} visitas</span>
          <span>{fmtNumber(artwork.likes)} valoraciones</span>
          <span>{fmtNumber(artwork.comments)} comentarios</span>
        </p>

        <div className={styles.actions}>
          <Link href="/#descargar" className="btn btn-cobalt btn-lg">Contactar con {firstName(artwork.artist.name)}</Link>
          {asDialog ? (
            <a href={`/${artwork.artist.handle}/obra/${artwork.id}`} className="btn btn-lg">Abrir la ficha</a>
          ) : (
            <Link href={`/${artwork.artist.handle}`} className="btn btn-lg">Ver el portfolio</Link>
          )}
        </div>
        <p className={styles.courtesy}>
          Imagen reducida con fines de consulta. Los derechos de la obra pertenecen a su autora o autor.
        </p>
      </div>
    </article>
  );
}

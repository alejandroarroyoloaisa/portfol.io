import Link from 'next/link';
import type { Artwork } from '@portfolio/schemas';
import { fmtSize, techniqueLabel } from '@/lib/format';
import { ProtectedImage } from './ProtectedImage';
import styles from './ArtworkCard.module.css';

const TILTS = [-1.5, 1.2, -0.8, 1.6, 1, -1.4];

export function artworkMeta(a: Pick<Artwork, 'technique' | 'widthCm' | 'heightCm' | 'year'>) {
  return `${techniqueLabel(a.technique)} · ${fmtSize(a.widthCm, a.heightCm).replace(' cm', '')} · ${a.year}`;
}

export function ArtworkCard({ artwork, index = 0, priority }: { artwork: Artwork; index?: number; priority?: boolean }) {
  const image = artwork.images[0];
  return (
    <Link
      href={`/${artwork.artist.handle}/obra/${artwork.id}`}
      scroll={false}
      className={styles.card}
      style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
    >
      <figure className={styles.figure}>
        <div className={styles.frame} style={{ background: image?.color ?? 'var(--c-arena)' }}>
          {image && (
            <ProtectedImage
              image={image}
              alt={artwork.title}
              fill
              priority={priority}
              sizes="(max-width: 600px) 92vw, (max-width: 1100px) 45vw, 300px"
            />
          )}
          {artwork.status === 'proceso' && <span className={styles.badge}>en proceso</span>}
        </div>
        <figcaption>
          <span className={styles.title}>{artwork.title}</span>
          <span className={styles.meta}>{artworkMeta(artwork)}</span>
        </figcaption>
      </figure>
    </Link>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { Artwork, SeriesSummary } from '@portfolio/schemas';
import { ArtworkCard } from '@/components/ArtworkCard';
import { plural } from '@/lib/format';
import styles from './profile.module.css';

const ALL = 'todo';
const LOOSE = 'otras';

/** «El cuaderno»: rejilla de obras con filtro por serie (W1). */
export function SeriesGallery({ artworks, series }: { artworks: Artwork[]; series: SeriesSummary[] }) {
  const [filter, setFilter] = useState<string>(ALL);

  const filters = useMemo(() => {
    const list = [{ key: ALL, label: 'Todo' }];
    for (const s of series) {
      if (artworks.some((a) => a.series?.id === s.id)) list.push({ key: s.id, label: `Serie ${s.title}` });
    }
    if (list.length > 1 && artworks.some((a) => !a.series)) list.push({ key: LOOSE, label: 'Otras obras' });
    return list;
  }, [artworks, series]);

  const visible = artworks.filter((a) =>
    filter === ALL ? true : filter === LOOSE ? !a.series : a.series?.id === filter,
  );

  return (
    <section className={`container ${styles.section}`} aria-labelledby="cuaderno-titulo" id="cuaderno">
      <div className={styles.sectionHead}>
        <h2 id="cuaderno-titulo" className={styles.h2}>El cuaderno</h2>
        {filters.length > 1 && (
          <div role="group" aria-label="Filtrar obras por serie" className={styles.tabs}>
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={styles.tab}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        Mostrando {plural(visible.length, 'obra', 'obras')}
      </p>
      {visible.length === 0 ? (
        <p className={`hand ${styles.empty}`}>todavía no hay obras publicadas en el cuaderno</p>
      ) : (
        <div className={styles.grid}>
          {visible.map((a, i) => (
            <ArtworkCard key={a.id} artwork={a} index={i} priority={i < 4} />
          ))}
        </div>
      )}
    </section>
  );
}

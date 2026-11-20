import Link from 'next/link';
import type { Artwork, SeriesSummary, Technique, UserProfile } from '@portfolio/schemas';
import { Blob, Leaf, Tape } from '@/components/Decor';
import { ProtectedImage } from '@/components/ProtectedImage';
import { capitalize, firstName, fmtNumber, plural, techniqueLabel, themeLabel } from '@/lib/format';
import { SeriesGallery } from './SeriesGallery';
import styles from './profile.module.css';

const DOTS = ['var(--c-coral)', 'var(--c-mostaza)', 'var(--c-verde)', 'var(--c-cobalto)'];
const TECH_CHIPS = ['chip-coral', 'chip-mustard', 'chip-cobalt'];

export function VerifiedMark({ size = 30, fill = 'var(--c-cobalto)', check = 'var(--c-crema)' }: { size?: number; fill?: string; check?: string }) {
  return (
    <svg className={styles.verified} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Perfil verificado">
      <path d="M12 1.5l2.6 2.2 3.4-.4.9 3.3 3 1.7-1.3 3.2 1.3 3.2-3 1.7-.9 3.3-3.4-.4L12 22.5l-2.6-2.2-3.4.4-.9-3.3-3-1.7 1.3-3.2L2.1 9.3l3-1.7.9-3.3 3.4.4z" fill={fill} />
      <path d="M7.5 12.2l3 3 6-6.2" fill="none" stroke={check} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Nombre partido en dos líneas como en el diseño («Lucía / Montero»). */
export function SplitName({ name }: { name: string }) {
  const [first, ...rest] = name.split(' ');
  return rest.length ? (
    <>
      {first}
      <br />
      {rest.join(' ')}
    </>
  ) : (
    <>{name}</>
  );
}

export function ArtistProfile({ profile, artworks, series }: { profile: UserProfile; artworks: Artwork[]; series: SeriesSummary[] }) {
  const name1 = firstName(profile.name);
  const kicker = [profile.headline ? profile.headline.charAt(0).toLowerCase() + profile.headline.slice(1) : null, profile.city]
    .filter(Boolean)
    .join(' · ');
  const covers = artworks.filter((a) => a.images[0]).slice(0, 2);
  const since = profile.career.length ? Math.min(...profile.career.map((c) => c.year)) : null;
  const career = [...profile.career].sort((a, b) => b.year - a.year);

  const techniques: Technique[] = Array.from(new Set([...profile.techniques, ...(Object.keys(profile.endorsements) as Technique[])]));
  const maxEndorse = Math.max(1, ...techniques.map((t) => profile.endorsements[t] ?? 0));

  return (
    <>
      <section className={`container ${styles.hero}`} aria-labelledby="perfil-nombre">
        <div>
          {kicker && <p className={`hand ${styles.kicker}`}>{kicker}</p>}
          <h1 id="perfil-nombre" className={styles.name}>
            <SplitName name={profile.name} />
            {profile.verified && <VerifiedMark />}
          </h1>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <ul className={`chips ${styles.heroChips}`} aria-label="Técnicas, temas y disponibilidad" style={{ listStyle: 'none', padding: 0, margin: '18px 0 0' }}>
            {profile.techniques.map((t, i) => (
              <li key={t} className={`chip ${TECH_CHIPS[i % TECH_CHIPS.length]}`}>{techniqueLabel(t)}</li>
            ))}
            {profile.themes.map((t) => (
              <li key={t} className="chip chip-outline">{themeLabel(t)}</li>
            ))}
            {profile.acceptsCommissions && <li className="chip chip-green">acepta encargos</li>}
            {profile.openToCalls && <li className="chip chip-white">abierta a convocatorias</li>}
            {profile.representedBy && <li className="chip chip-ink">representación: {profile.representedBy}</li>}
          </ul>
          <div className={styles.ctas}>
            <Link href="/#descargar" className="btn btn-cobalt btn-lg">Conectar en la app</Link>
            <a href="#contacto" className="btn btn-lg">Escribir a {name1}</a>
          </div>
        </div>
        <div className={styles.collage} aria-hidden="true">
          <Blob color="var(--c-cobalto)" className={styles.collageBlob} />
          <Leaf color="var(--c-verde)" className={styles.collageLeaf} />
          {covers[0] && (
            <div className={styles.cutA}>
              <div className={styles.cutInner}>
                <ProtectedImage image={covers[0].images[0]} alt="" fill priority sizes="300px" />
              </div>
              <Tape style={{ top: -12, left: 100, transform: 'rotate(5deg)' }} />
            </div>
          )}
          {covers[1] && (
            <div className={styles.cutB}>
              <div className={styles.cutInner}>
                <ProtectedImage image={covers[1].images[0]} alt="" fill sizes="240px" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.stats} aria-label="Cifras">
        <dl className={`container ${styles.statsInner}`}>
          <div>
            <dt className={`hand ${styles.statLabel}`}>obras en el cuaderno</dt>
            <dd className={styles.statValue}>{fmtNumber(profile.counts.artworks)}</dd>
          </div>
          <div>
            <dt className={`hand ${styles.statLabel}`}>conexiones</dt>
            <dd className={styles.statValue}>{fmtNumber(profile.counts.connections)}</dd>
          </div>
          <div>
            <dt className={`hand ${styles.statLabel}`}>{profile.counts.exhibitions === 1 ? 'exposición' : 'exposiciones'}</dt>
            <dd className={styles.statValue}>{fmtNumber(profile.counts.exhibitions)}</dd>
          </div>
          {since ? (
            <div>
              <dt className={`hand ${styles.statLabel}`}>en la trayectoria desde</dt>
              <dd className={styles.statValue}>{since}</dd>
            </div>
          ) : (
            <div>
              <dt className={`hand ${styles.statLabel}`}>{profile.counts.followers === 1 ? 'seguidor' : 'seguidores'}</dt>
              <dd className={styles.statValue}>{fmtNumber(profile.counts.followers)}</dd>
            </div>
          )}
        </dl>
      </section>

      <SeriesGallery artworks={artworks} series={series} />

      <section className={`container ${styles.split}`}>
        <div>
          {career.length > 0 && (
            <>
              <h2 className={styles.h3}>Trayectoria</h2>
              <ol className={styles.timeline}>
                {career.map((c, i) => (
                  <li key={`${c.year}-${i}`}>
                    <span aria-hidden="true" className={styles.dot} style={{ background: DOTS[i % DOTS.length] }} />
                    <p className={`hand ${styles.year}`}>{c.year}</p>
                    <p className={styles.milestone}>{c.text}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
          {techniques.length > 0 && (
            <div style={{ marginTop: career.length ? 44 : 0 }}>
              <h2 className={styles.h3} style={{ marginBottom: 0 }}>Técnicas</h2>
              <p className="hand" style={{ fontSize: 22 }}>validadas por otros profesionales</p>
              <ul className={styles.techList}>
                {techniques.map((t) => {
                  const n = profile.endorsements[t] ?? 0;
                  return (
                    <li key={t}>
                      <span>{capitalize(techniqueLabel(t))}</span>
                      <span className={styles.bar} aria-hidden="true">
                        <span style={{ width: `${(n / maxEndorse) * 100}%` }} />
                      </span>
                      <span className={styles.techCount}>{n ? plural(n, 'validación', 'validaciones') : 'sin validar'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <aside className={styles.contactCard} id="contacto" aria-labelledby="contacto-titulo">
          <Tape variant="cream" style={{ top: -12, right: 60, transform: 'rotate(6deg)' }} />
          <p className={`hand ${styles.contactKicker}`}>¿te interesa su obra?</p>
          <h2 id="contacto-titulo" className={styles.contactTitle}>Escribe a {name1}</h2>
          <p className={styles.contactText}>
            Galerías, comisariado y coleccionistas contactan con {name1} desde la app de Portfol.io. Si gestionas
            una galería o una institución, también puedes escribirle desde tu panel cuando se presente a una convocatoria.
          </p>
          <div className={styles.ctas} style={{ marginTop: 0 }}>
            <Link href="/#descargar" className="btn btn-ink">Abrir en la app</Link>
            <Link href="/acceder" className="btn">Entrar como galería</Link>
          </div>
        </aside>
      </section>
    </>
  );
}

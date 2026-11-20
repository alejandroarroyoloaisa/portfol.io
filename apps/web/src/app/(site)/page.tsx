import type { Metadata } from 'next';
import Link from 'next/link';
import type { Artwork, CallSummary, ImageVariants, UserProfile } from '@portfolio/schemas';
import { CallCard } from '@/components/CallCard';
import { Blob, Leaf, Tape } from '@/components/Decor';
import { ProtectedImage } from '@/components/ProtectedImage';
import { orFallback, orNull, publicApi } from '@/lib/api';
import { fmtNumber } from '@/lib/format';
import styles from './landing.module.css';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const DEMO_HANDLES = ['noravidal', 'luciamontero', 'galeriaalcana'];

interface Demo {
  profile: UserProfile;
  cover: ImageVariants | null;
  artworks: Artwork[];
}

async function loadDemos(): Promise<Demo[]> {
  const api = publicApi(300);
  const demos = await Promise.all(
    DEMO_HANDLES.map(async (h) => {
      const profile = await orFallback(orNull(api.users.get(h)), null);
      if (!profile) return null;
      const artworks = profile.organization ? [] : await orFallback(api.users.artworks(profile.id), []);
      const cover = profile.organization?.currentExhibition?.cover ?? artworks.find((a) => a.images[0])?.images[0] ?? null;
      return { profile, cover, artworks };
    }),
  );
  return demos.filter((d): d is Demo => d !== null);
}

export default async function Home() {
  const [demos, calls] = await Promise.all([
    loadDemos(),
    orFallback(publicApi(300).calls.list(), [] as CallSummary[]),
  ]);
  const open = calls.filter((c) => c.status === 'abierta');
  const collage = demos.flatMap((d) => d.artworks.filter((a) => a.images[0]).slice(0, 2)).slice(0, 3);
  const orgs = new Set(open.map((c) => c.organization.id)).size;

  return (
    <>
      <section className={`container ${styles.hero}`} aria-labelledby="portada-titulo">
        <div>
          <p className={`hand ${styles.kicker}`}>la red profesional de la pintura</p>
          <h1 id="portada-titulo" className={styles.title}>
            Tu obra, en el <em>muro</em> adecuado
          </h1>
          <p className={styles.lead}>
            Portfol.io reúne a pintoras y pintores con galerías, comisariado e instituciones. Publica tu cuaderno por
            series, comparte un portfolio que se encuentra en Google y recibe las convocatorias que encajan con tu técnica.
          </p>
          <div className={styles.ctas}>
            <Link href="/noravidal" className="btn btn-cobalt btn-lg">Ver un portfolio</Link>
            <Link href="/acceder" className="btn btn-lg">Soy galería</Link>
          </div>
        </div>
        <div className={styles.collage}>
          <Blob color="var(--c-cobalto)" className={styles.blob} />
          <Leaf color="var(--c-verde)" className={styles.leaf} />
          {collage.map((a, i) => (
            <Link key={a.id} href={`/${a.artist.handle}/obra/${a.id}`} className={`${styles.cut} ${styles[`c${i + 1}`]}`}>
              <span className={styles.cutImg} style={{ display: 'block' }}>
                <ProtectedImage image={a.images[0]} alt={`${a.title}, de ${a.artist.name}`} fill priority={i === 0} sizes="260px" />
              </span>
              <span className={styles.cutCaption}>{a.title} · {a.artist.name}</span>
              {i === 0 && <Tape style={{ top: -12, left: 90, transform: 'rotate(5deg)' }} />}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.band} aria-label="Portfol.io en cifras">
        <div className={`container ${styles.bandInner}`}>
          <p>
            <span className={styles.bandValue} style={{ display: 'block' }}>{fmtNumber(open.length)}</span>
            <span className={`hand ${styles.bandLabel}`}>convocatorias abiertas</span>
          </p>
          <p>
            <span className={styles.bandValue} style={{ display: 'block' }}>{fmtNumber(orgs)}</span>
            <span className={`hand ${styles.bandLabel}`}>galerías e instituciones convocando</span>
          </p>
          <p>
            <span className={styles.bandValue} style={{ display: 'block' }}>0 €</span>
            <span className={`hand ${styles.bandLabel}`}>para artistas, siempre</span>
          </p>
          <p>
            <span className={styles.bandValue} style={{ display: 'block' }}>0 originales</span>
            <span className={`hand ${styles.bandLabel}`}>servidos: solo copias reducidas de tu obra</span>
          </p>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="para-quien">
        <h2 id="para-quien" className={styles.h2}>Hecha para el taller y para la sala</h2>
        <div className={styles.audiences}>
          <article id="artistas" className={styles.audience} style={{ background: 'var(--c-coral)', transform: 'rotate(-1deg)' }}>
            <Tape variant="cream" style={{ top: -12, right: 60, transform: 'rotate(6deg)' }} />
            <p className={`hand ${styles.audienceKicker}`}>si pintas</p>
            <h3 className={styles.audienceTitle}>Para artistas</h3>
            <ul>
              <li>Tu cuaderno de obra, ordenado por series y técnicas.</li>
              <li>Un portfolio web público con tu propia dirección, listo para compartir.</li>
              <li>Convocatorias que encajan contigo, con el porqué del encaje.</li>
              <li>Solicitudes desde el móvil y aviso cuando cambian de estado.</li>
            </ul>
            <Link href="#descargar" className="btn btn-ink">Descargar la app</Link>
          </article>
          <article id="galerias" className={styles.audience} style={{ background: 'var(--c-cobalto)', color: 'var(--c-crema)', transform: 'rotate(1deg)' }}>
            <Tape style={{ top: -12, left: 60, transform: 'rotate(-5deg)' }} />
            <p className={`hand ${styles.audienceKicker}`} style={{ color: 'var(--c-mostaza)' }}>si programas</p>
            <h3 className={styles.audienceTitle}>Para galerías e instituciones</h3>
            <ul>
              <li>Publica y edita convocatorias desde la web.</li>
              <li>Revisa, filtra, preselecciona y descarta candidaturas con su encaje.</li>
              <li>Comunica el resultado a cada artista con una nota.</li>
              <li>Escribe a las artistas sin salir del panel.</li>
            </ul>
            <Link href="/acceder" className="btn btn-cream">Entrar al panel</Link>
          </article>
        </div>
      </section>

      {demos.length > 0 && (
        <section id="portfolios" className={`container ${styles.section}`} aria-labelledby="demos-titulo">
          <div className={styles.sectionHead}>
            <h2 id="demos-titulo" className={styles.h2}>Portfolios de ejemplo</h2>
            <p className="hand" style={{ fontSize: 24 }}>así se ve un perfil público</p>
          </div>
          <ul className={styles.demos}>
            {demos.map((d, i) => (
              <li key={d.profile.id}>
                <Link href={`/${d.profile.handle}`} className={styles.demo} style={{ transform: `rotate(${[-1.2, 1, -0.6][i % 3]}deg)` }}>
                  <span className={styles.demoImg} style={{ display: 'block', background: d.cover?.color ?? 'var(--c-arena)' }}>
                    {d.cover && <ProtectedImage image={d.cover} alt="" fill sizes="300px" />}
                  </span>
                  <span className={styles.demoName}>{d.profile.name}</span>
                  <span className={styles.demoMeta}>{[d.profile.headline, d.profile.city].filter(Boolean).join(' · ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open.length > 0 && (
        <section className={`container ${styles.section} ${styles.callsWrap}`} aria-labelledby="convocatorias-titulo">
          <div className={styles.sectionHead}>
            <h2 id="convocatorias-titulo" className={styles.h2}>Convocatorias abiertas</h2>
            <Link href="/convocatorias" className="btn btn-white">Ver todas</Link>
          </div>
          <ul className="call-grid">
            {open.slice(0, 3).map((c, i) => (
              <li key={c.id}>
                <CallCard call={c} index={i} showOrg />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

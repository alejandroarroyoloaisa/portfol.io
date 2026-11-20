import Link from 'next/link';
import type { UserProfile } from '@portfolio/schemas';
import { ROLE_LABELS } from '@portfolio/schemas';
import { Avatar } from '@/components/Avatar';
import { CallCard } from '@/components/CallCard';
import { Blob, Leaf, Tape } from '@/components/Decor';
import { ProtectedImage } from '@/components/ProtectedImage';
import { fmtDate, fmtNumber } from '@/lib/format';
import { SplitName, VerifiedMark } from './ArtistProfile';
import styles from './profile.module.css';

export function OrganizationProfile({ profile }: { profile: UserProfile }) {
  const org = profile.organization;
  const expo = org?.currentExhibition ?? null;
  const kicker = profile.headline
    ? profile.headline.charAt(0).toLowerCase() + profile.headline.slice(1)
    : ROLE_LABELS[profile.role].toLowerCase();
  const location = [org?.address ?? profile.city, org?.openingHours].filter(Boolean).join(' · ');
  const moreArtists = org ? org.artistsTotal - org.artists.length : 0;

  return (
    <>
      <section className={styles.orgHero} aria-labelledby="perfil-nombre">
        <Blob color="var(--c-mostaza)" className={styles.orgBlob} />
        <Leaf color="var(--c-coral)" className={styles.orgLeaf} />
        <div className={`container ${styles.orgHeroInner}`}>
          <div>
            <p className={`hand ${styles.orgKicker}`}>{kicker}</p>
            <h1 id="perfil-nombre" className={styles.name}>
              <SplitName name={profile.name} />
              {profile.verified && <VerifiedMark fill="var(--c-mostaza)" check="var(--c-tinta)" />}
            </h1>
          </div>
          {expo?.cover && (
            <Link href={`/${expo.artist.handle}`} className={styles.orgCover} aria-label={`Ahora en sala: ${expo.title}, de ${expo.artist.name}`}>
              <div className={styles.orgCoverImg}>
                <ProtectedImage image={expo.cover} alt="" fill priority sizes="360px" />
              </div>
              <Tape style={{ top: -12, left: 40, transform: 'rotate(-4deg)' }} />
              <span className="hand" style={{ display: 'block', marginTop: 8, fontSize: 22 }}>ahora en sala</span>
              <span style={{ display: 'block', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{expo.title}</span>
            </Link>
          )}
        </div>
      </section>

      <section className={`container ${styles.orgAbout}`} aria-label="Sobre la organización">
        <div>
          {profile.bio && <p className={styles.bio} style={{ marginTop: 0 }}>{profile.bio}</p>}
          {location && <p className={`hand ${styles.address}`}>{location}</p>}
        </div>
        <div>
          <ul className="chips" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Datos">
            <li className="chip chip-ink">{ROLE_LABELS[profile.role]}</li>
            {org?.since && <li className="chip chip-mustard">desde {org.since}</li>}
            {profile.city && <li className="chip chip-outline">{profile.city}</li>}
            {profile.openToCalls && <li className="chip chip-green">abre convocatorias</li>}
          </ul>
          <div className={styles.ctas} style={{ marginTop: 20 }}>
            <Link href="/#descargar" className="btn btn-cobalt btn-lg">Seguir en la app</Link>
            <Link href="/convocatorias" className="btn btn-lg">Ver convocatorias</Link>
          </div>
        </div>
      </section>

      <section className={styles.stats} aria-label="Cifras">
        <dl className={`container ${styles.statsInner}`}>
          <div>
            <dt className={`hand ${styles.statLabel}`}>{org?.artistsTotal === 1 ? 'artista representado' : 'artistas representados'}</dt>
            <dd className={styles.statValue}>{fmtNumber(org?.artistsTotal ?? 0)}</dd>
          </div>
          <div>
            <dt className={`hand ${styles.statLabel}`}>{org?.openCalls.length === 1 ? 'convocatoria abierta' : 'convocatorias abiertas'}</dt>
            <dd className={styles.statValue}>{fmtNumber(org?.openCalls.length ?? 0)}</dd>
          </div>
          <div>
            <dt className={`hand ${styles.statLabel}`}>{profile.counts.exhibitions === 1 ? 'exposición' : 'exposiciones'}</dt>
            <dd className={styles.statValue}>{fmtNumber(profile.counts.exhibitions)}</dd>
          </div>
          <div>
            <dt className={`hand ${styles.statLabel}`}>{profile.counts.followers === 1 ? 'seguidor' : 'seguidores'}</dt>
            <dd className={styles.statValue}>{fmtNumber(profile.counts.followers)}</dd>
          </div>
        </dl>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="convocatorias-titulo">
        <h2 id="convocatorias-titulo" className={styles.h2}>Convocatorias abiertas</h2>
        {org && org.openCalls.length > 0 ? (
          <div className="call-grid">
            {org.openCalls.map((c, i) => <CallCard key={c.id} call={c} index={i} />)}
          </div>
        ) : (
          <p className={`hand ${styles.empty}`}>ahora mismo no hay convocatorias abiertas</p>
        )}
      </section>

      {expo && (
        <section className={`container ${styles.section}`} aria-labelledby="sala-titulo">
          <h2 id="sala-titulo" className={styles.h2}>Ahora en sala</h2>
          <Link href={`/${expo.artist.handle}`} className={styles.expo}>
            <div className={styles.expoImg} style={{ background: expo.cover?.color ?? 'var(--c-arena)' }}>
              {expo.cover && <ProtectedImage image={expo.cover} alt="" fill sizes="180px" />}
            </div>
            <div>
              <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{expo.title}</p>
              <p style={{ marginTop: 6, fontWeight: 700 }}>
                {expo.artist.name}
                {expo.endsAt ? ` · hasta el ${fmtDate(expo.endsAt)}` : ''}
              </p>
              {expo.virtual && (
                <p className="hand" style={{ fontSize: 22, color: 'var(--c-cobalto)' }}>visítala también en la sala virtual de la app</p>
              )}
            </div>
          </Link>
        </section>
      )}

      {org && org.artists.length > 0 && (
        <section className={`container ${styles.section}`} style={{ paddingBottom: 64 }} aria-labelledby="artistas-titulo">
          <h2 id="artistas-titulo" className={styles.h2}>Artistas de la galería</h2>
          <ul className={styles.artists} style={{ listStyle: 'none', padding: 0 }}>
            {org.artists.map((a) => (
              <li key={a.id}>
                <Link href={`/${a.handle}`} className={styles.artist}>
                  <Avatar user={a} size={72} />
                  <span>{a.name}</span>
                  {a.city && <small>{a.city}</small>}
                </Link>
              </li>
            ))}
            {moreArtists > 0 && (
              <li className={styles.artist}>
                <span className={styles.more}>+{moreArtists}</span>
                <span>más</span>
              </li>
            )}
          </ul>
          <p className="hand" style={{ fontSize: 22, marginTop: 12 }}>
            ¿quieres exponer aquí? presenta tu obra a sus convocatorias abiertas
          </p>
        </section>
      )}
    </>
  );
}

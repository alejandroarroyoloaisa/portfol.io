import Link from 'next/link';
import styles from './SiteChrome.module.css';

export function SiteFooter({ kicker = '¿pintas?', title = 'Lleva tu taller en el bolsillo' }: { kicker?: string; title?: string }) {
  return (
    <footer className={styles.footer} id="descargar">
      <div className={`container ${styles.footerInner}`}>
        <div>
          <p className={`hand ${styles.footerKicker}`}>{kicker}</p>
          <p className={styles.footerTitle} style={{ fontWeight: 800 }}>{title}</p>
        </div>
        <div className={styles.stores} aria-label="Aplicación móvil">
          <span className={`${styles.store} ${styles.storeSolid}`}>
            <small>App para</small>iOS
          </span>
          <span className={styles.store}>
            <small>App para</small>Android
          </span>
        </div>
      </div>
      <div className={`container ${styles.footerBottom}`}>
        <span>Portfol.io · Trabajo Fin de Máster · Universidad de Jaén</span>
        <nav aria-label="Pie de página">
          <Link href="/convocatorias">Convocatorias</Link>
          <Link href="/acceder">Panel de galerías</Link>
          <Link href="/noravidal">Portfolio de ejemplo</Link>
        </nav>
      </div>
    </footer>
  );
}

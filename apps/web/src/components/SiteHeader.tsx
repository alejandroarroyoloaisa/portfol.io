import Link from 'next/link';
import { HeaderNav } from './HeaderNav';
import { Logo } from './Logo';
import styles from './SiteChrome.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className={`container ${styles.headerInner}`}>
        <Logo />
        <HeaderNav className={styles.nav} />
        <div className={styles.actions}>
          <Link href="/acceder" className="btn">Entrar</Link>
          <Link href="/#descargar" className="btn btn-coral">Únete gratis</Link>
        </div>
      </div>
    </header>
  );
}

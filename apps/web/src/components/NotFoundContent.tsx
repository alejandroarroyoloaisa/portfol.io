import Link from 'next/link';
import { Blob, Tape } from './Decor';
import styles from './NotFoundContent.module.css';

/** Contenido de la página 404 en el estilo «Recortes». */
export function NotFoundContent() {
  return (
    <div className={`container ${styles.wrap}`}>
      <div>
        <p className={`hand ${styles.kicker}`}>esta hoja se ha despegado del cuaderno</p>
        <h1 className={styles.title}>No encontramos esta página</h1>
        <p className={styles.text}>
          Puede que el enlace esté mal escrito, que la artista haya cambiado su alias o que la obra ya no sea pública.
        </p>
        <div className={styles.ctas}>
          <Link href="/" className="btn btn-ink btn-lg">Volver a la portada</Link>
          <Link href="/convocatorias" className="btn btn-lg">Ver convocatorias</Link>
        </div>
      </div>
      <div className={styles.art} aria-hidden="true">
        <Blob color="var(--c-coral)" className={styles.blob} />
        <div className={styles.paper}>
          <span />
          404
          <Tape style={{ top: -12, left: 70, transform: 'rotate(8deg)' }} />
        </div>
      </div>
    </div>
  );
}

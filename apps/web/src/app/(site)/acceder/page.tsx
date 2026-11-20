import type { Metadata } from 'next';
import { Tape } from '@/components/Decor';
import { safeNext } from '@/lib/auth-cookies';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Entrar al panel',
  description: 'Acceso al panel de Portfol.io para galerías, comisariado e instituciones.',
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<'/acceder'>) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === 'string' ? sp.next : undefined);
  const expired = sp.caducada === '1';
  const loggedOut = sp.salida === '1';

  return (
    <div className={`container ${styles.wrap}`}>
      <div>
        <p className={`hand ${styles.kicker}`}>para galerías e instituciones</p>
        <h1 className={styles.title}>Panel de convocatorias</h1>
        <p className={styles.lead}>
          Entra con la cuenta de tu galería o institución para publicar convocatorias y revisar las candidaturas que te
          llegan desde la app.
        </p>
        <ul className={styles.list}>
          <li>Publica y edita convocatorias</li>
          <li>Filtra, preselecciona y descarta candidaturas</li>
          <li>Comunica el resultado y escribe a cada artista</li>
        </ul>
      </div>
      <section className={styles.card} aria-labelledby="acceso-titulo">
        <Tape style={{ top: -12, left: 120, transform: 'rotate(4deg)' }} />
        <h2 id="acceso-titulo" className={styles.cardTitle}>Entrar</h2>
        {expired && <p className={`form-alert ${styles.notice}`} role="status">Tu sesión ha caducado. Vuelve a entrar.</p>}
        {loggedOut && <p className={`form-ok ${styles.notice}`} role="status">Has cerrado la sesión.</p>}
        <LoginForm next={next} />
        <p className={styles.demo}>
          Cuenta de demostración: <code>alcana@portfol.io</code> · contraseña <code>portfolio123</code>
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ROLE_LABELS } from '@portfolio/schemas';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { getDashboard, getMe } from '@/lib/session';
import { logout } from './actions';
import { PanelNav } from './PanelNav';
import styles from './panel.module.css';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel · Portfol.io' },
  robots: { index: false, follow: false },
};

function LogoutButton() {
  return (
    <form action={logout} className={styles.logout}>
      <button type="submit">Cerrar sesión</button>
    </form>
  );
}

export default async function PanelLayout({ children }: LayoutProps<'/panel'>) {
  const me = await getMe();
  const dashboard = me.orgId ? await getDashboard() : null;

  if (!dashboard) {
    return (
      <main id="contenido" className="container" style={{ padding: '64px 24px 96px', maxWidth: 760 }}>
        <Logo />
        <p className="hand" style={{ fontSize: 30, color: 'var(--c-anotacion)', marginTop: 40 }}>
          hola, {me.name.split(' ')[0]}
        </p>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 68px)', marginTop: 4 }}>Este panel es para galerías e instituciones</h1>
        <p style={{ marginTop: 18, fontSize: 18 }}>
          Has entrado con una cuenta de {ROLE_LABELS[me.role].toLowerCase()}. El panel web sirve para publicar
          convocatorias y revisar candidaturas, así que solo está disponible para cuentas de organización y para
          las personas que forman parte de ellas. Tu cuaderno, tus solicitudes y tus mensajes están en la app.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26, alignItems: 'center' }}>
          <Link href={`/${me.handle}`} className="btn btn-cobalt btn-lg">Ver mi portfolio público</Link>
          <form action={logout}>
            <button type="submit" className="btn btn-lg">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  const org = dashboard.organization;
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <aside className={styles.aside}>
        <Logo dot="var(--c-coral)" size={28} href="/panel" />
        <p className={`hand ${styles.asideKicker}`}>panel de {org.role === 'institucion' ? 'institución' : 'galería'}</p>
        <PanelNav orgHandle={org.handle} />
        <div style={{ marginTop: 'auto' }}>
          <div className={styles.user}>
            <Avatar user={me} size={42} />
            <span>
              <span className={styles.userName}>{me.name}</span>
              <span className={styles.userOrg}>{org.id === me.id ? 'Cuenta de la organización' : org.name}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main id="contenido" className={styles.main}>{children}</main>
    </div>
  );
}

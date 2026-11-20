'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './panel.module.css';

export function PanelNav({ orgHandle }: { orgHandle: string }) {
  const path = usePathname();
  const isCalls = path.startsWith('/panel/convocatorias') && path !== '/panel/convocatorias/nueva';
  const items = [
    { href: '/panel', label: 'Resumen', current: path === '/panel' },
    { href: '/panel/convocatorias', label: 'Convocatorias', current: isCalls },
    { href: '/panel/convocatorias/nueva', label: 'Nueva convocatoria', current: path === '/panel/convocatorias/nueva' },
  ];
  return (
    <nav aria-label="Panel" className={styles.nav}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.current ? 'page' : undefined}>
          {i.label}
        </Link>
      ))}
      <Link href={`/${orgHandle}`}>Ver perfil público</Link>
    </nav>
  );
}

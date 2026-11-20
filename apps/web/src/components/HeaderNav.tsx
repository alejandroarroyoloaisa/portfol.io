'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HeaderNav({ className }: { className?: string }) {
  const path = usePathname();
  const current = (p: string) => (path === p || path.startsWith(`${p}/`) ? 'page' : undefined);
  return (
    <nav aria-label="Principal" className={className}>
      <Link href="/#portfolios">Explorar</Link>
      <Link href="/convocatorias" aria-current={current('/convocatorias')}>Convocatorias</Link>
      <Link href="/#galerias">Para galerías</Link>
    </nav>
  );
}

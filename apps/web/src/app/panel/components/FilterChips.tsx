import Link from 'next/link';
import styles from './filters.module.css';

export interface FilterChip {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/** Filtros como enlaces (funcionan sin JavaScript y quedan en la URL). */
export function FilterChips({ label, items, current }: { label: string; items: FilterChip[]; current: string }) {
  return (
    <nav aria-label={label}>
      <ul className={styles.chips}>
        {items.map((f) => (
          <li key={f.key}>
            <Link href={f.href} className={styles.chip} aria-current={f.key === current ? 'page' : undefined} scroll={false}>
              {f.label}
              {f.count !== undefined && <span className={styles.count}>{f.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

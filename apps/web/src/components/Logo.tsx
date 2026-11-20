import Link from 'next/link';

export function Logo({ dot = 'var(--c-cobalto)', size = 30, href = '/' }: { dot?: string; size?: number; href?: string | null }) {
  const mark = (
    <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
      Portfol<span style={{ color: dot }}>.io</span>
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} aria-label="Portfol.io, ir a la portada" style={{ color: 'inherit' }}>
      {mark}
    </Link>
  );
}

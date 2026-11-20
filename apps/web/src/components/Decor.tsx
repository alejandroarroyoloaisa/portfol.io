/** Formas decorativas del sistema «Recortes» (siempre aria-hidden). */
import type { CSSProperties } from 'react';

const BLOB = 'M50 4 C58 18 72 10 74 26 C88 24 92 40 80 48 C96 58 84 74 70 70 C72 88 56 96 50 82 C44 96 28 88 30 70 C16 74 4 58 20 48 C8 40 12 24 26 26 C28 10 42 18 50 4Z';
const LEAF = 'M20 100 C10 70 40 60 25 35 C15 15 40 5 45 0 L55 0 C50 15 30 25 40 45 C55 70 30 80 40 100Z';

interface ShapeProps {
  color: string;
  className?: string;
  style?: CSSProperties;
}

export function Blob({ color, className, style }: ShapeProps) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className={className} style={style}>
      <path d={BLOB} fill={color} />
    </svg>
  );
}

export function Leaf({ color, className, style }: ShapeProps) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" preserveAspectRatio="none" className={className} style={style}>
      <path d={LEAF} fill={color} />
    </svg>
  );
}

export function Tape({ style, variant }: { style?: CSSProperties; variant?: 'cream' | 'coral' }) {
  return <span aria-hidden="true" className={`tape${variant ? ` tape-${variant}` : ''}`} style={style} />;
}

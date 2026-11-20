'use client';

import Link from 'next/link';

/** Error inesperado (p. ej., la API no responde). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenido" className="container" style={{ padding: '72px 24px 96px', maxWidth: 760 }}>
      <p className="hand" style={{ fontSize: 30, color: 'var(--c-anotacion)' }}>se ha corrido la tinta</p>
      <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', marginTop: 6 }}>Algo no ha ido bien</h1>
      <p style={{ marginTop: 16, fontSize: 18 }}>
        No hemos podido cargar esta página. Puede que la API de Portfol.io no esté disponible ahora mismo.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
        <button type="button" className="btn btn-ink btn-lg" onClick={() => reset()}>Reintentar</button>
        <Link href="/" className="btn btn-lg">Volver a la portada</Link>
      </div>
    </main>
  );
}

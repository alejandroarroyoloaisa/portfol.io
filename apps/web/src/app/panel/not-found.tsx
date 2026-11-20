import Link from 'next/link';

export default function PanelNotFound() {
  return (
    <div style={{ maxWidth: 640, paddingTop: 30 }}>
      <p className="hand" style={{ fontSize: 28, color: 'var(--c-anotacion)' }}>no está en tu archivo</p>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', marginTop: 4 }}>No encontramos esta página</h1>
      <p style={{ marginTop: 14, fontSize: 18 }}>
        Puede que la convocatoria o la solicitud no exista o que pertenezca a otra organización.
      </p>
      <Link href="/panel" className="btn btn-ink btn-lg" style={{ marginTop: 22 }}>Volver al resumen</Link>
    </div>
  );
}

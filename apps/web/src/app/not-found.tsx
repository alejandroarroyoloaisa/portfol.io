import { NotFoundContent } from '@/components/NotFoundContent';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = { title: 'Página no encontrada', robots: { index: false } };

/** 404 de rutas que no existen (fuera de la zona pública con cabecera). */
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main id="contenido" style={{ flex: 1 }}>
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  );
}

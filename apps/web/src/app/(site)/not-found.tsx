import { NotFoundContent } from '@/components/NotFoundContent';

export const metadata = { title: 'Página no encontrada', robots: { index: false } };

/** 404 dentro de la zona pública (alias, obras o convocatorias inexistentes): la cabecera ya la pone el layout. */
export default function SiteNotFound() {
  return <NotFoundContent />;
}

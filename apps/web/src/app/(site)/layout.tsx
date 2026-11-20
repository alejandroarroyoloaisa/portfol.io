import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main id="contenido" style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}

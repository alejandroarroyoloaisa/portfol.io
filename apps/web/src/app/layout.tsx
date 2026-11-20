import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Caveat } from 'next/font/google';
import { colors } from '@portfolio/tokens';
import { SITE_URL } from '@/lib/config';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '700', '800'],
  display: 'swap',
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  display: 'swap',
});

/** Variables CSS generadas a partir de los tokens de diseño «Recortes» (fuente única de verdad). */
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const tokenVars = `:root{${Object.entries(colors).map(([k, v]) => `--c-${kebab(k)}:${v}`).join(';')}}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Portfol.io · La red profesional de la pintura', template: '%s · Portfol.io' },
  description:
    'Portfol.io es la red profesional para pintoras y pintores: portfolio público, convocatorias con encaje y un panel para galerías e instituciones.',
  applicationName: 'Portfol.io',
  openGraph: { siteName: 'Portfol.io', locale: 'es_ES', type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: colors.crema,
  colorScheme: 'light',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${caveat.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokenVars }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkDetail } from '@/components/ArtworkDetail';
import { JsonLd } from '@/components/JsonLd';
import { getArtwork } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { fmtSize, techniqueLabel, themeLabel } from '@/lib/format';

export const revalidate = 60;

export function generateStaticParams(): { handle: string; id: string }[] {
  return [];
}

async function load(handle: string, id: string) {
  const artwork = await getArtwork(id);
  if (!artwork || artwork.artist.handle !== handle.toLowerCase() || artwork.draft) return null;
  return artwork;
}

export async function generateMetadata({ params }: PageProps<'/[handle]/obra/[id]'>): Promise<Metadata> {
  const { handle, id } = await params;
  const a = await load(handle, id);
  if (!a) return { title: 'Obra no encontrada', robots: { index: false } };
  const title = `${a.title}, de ${a.artist.name}`;
  const description = a.note ?? `${techniqueLabel(a.technique)}, ${fmtSize(a.widthCm, a.heightCm)}, ${a.year}. Obra de ${a.artist.name} en Portfol.io.`;
  const img = a.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/${a.artist.handle}/obra/${a.id}` },
    openGraph: { type: 'article', title, description, images: img ? [{ url: img.medium, alt: a.title }] : undefined },
    twitter: { card: img ? 'summary_large_image' : 'summary', title, description, images: img ? [img.medium] : undefined },
  };
}

export default async function ArtworkPage({ params }: PageProps<'/[handle]/obra/[id]'>) {
  const { handle, id } = await params;
  const a = await load(handle, id);
  if (!a) notFound();
  const url = `${SITE_URL}/${a.artist.handle}/obra/${a.id}`;
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 72 }}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'VisualArtwork',
          name: a.title,
          url,
          image: a.images[0]?.large,
          artMedium: techniqueLabel(a.technique),
          artform: 'Pintura',
          dateCreated: String(a.year),
          height: { '@type': 'Distance', name: `${a.heightCm} cm` },
          width: { '@type': 'Distance', name: `${a.widthCm} cm` },
          keywords: a.themes.map(themeLabel).join(', ') || undefined,
          description: a.note ?? undefined,
          creator: { '@type': 'Person', name: a.artist.name, url: `${SITE_URL}/${a.artist.handle}` },
        }}
      />
      <nav aria-label="Migas de pan" style={{ marginBottom: 18, fontWeight: 700 }}>
        <Link href={`/${a.artist.handle}`}>← Volver al portfolio de {a.artist.name}</Link>
      </nav>
      <ArtworkDetail artwork={a} headingId="obra-titulo" />
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ORG_ROLES, type Artwork, type UserProfile } from '@portfolio/schemas';
import { JsonLd } from '@/components/JsonLd';
import { ViewBeacon } from '@/components/ViewBeacon';
import { getArtworks, getProfile, getSeries, orFallback } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { fmtSize, techniqueLabel } from '@/lib/format';
import { ArtistProfile } from './ArtistProfile';
import { OrganizationProfile } from './OrganizationProfile';

/** Portfolio público indexable (RF-12): HTML en el servidor, regenerado cada minuto (ISR). */
export const revalidate = 60;

/** Sin rutas precalculadas: cada portfolio se genera en la primera visita y se cachea. */
export function generateStaticParams(): { handle: string }[] {
  return [];
}

const isOrg = (p: UserProfile) => ORG_ROLES.includes(p.role);

function describe(p: UserProfile): string {
  const lead = [p.headline, p.city].filter(Boolean).join(' · ');
  const text = [lead, p.bio].filter(Boolean).join('. ');
  return text.length > 158 ? `${text.slice(0, 155).trimEnd()}…` : text || `Portfolio de ${p.name} en Portfol.io.`;
}

export async function generateMetadata({ params }: PageProps<'/[handle]'>): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) return { title: 'Perfil no encontrado', robots: { index: false } };

  const artworks = isOrg(profile) ? [] : await orFallback(getArtworks(profile.id), [] as Artwork[]);
  const cover = isOrg(profile) ? profile.organization?.currentExhibition?.cover : artworks.find((a) => a.images[0])?.images[0];
  const description = describe(profile);
  const title = `${profile.name} (@${profile.handle})`;

  return {
    title,
    description,
    alternates: { canonical: `/${profile.handle}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/${profile.handle}`,
      images: cover ? [{ url: cover.medium, alt: profile.name }] : undefined,
    },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description, images: cover ? [cover.medium] : undefined },
  };
}

function personLd(p: UserProfile, artworks: Artwork[]) {
  const url = `${SITE_URL}/${p.handle}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#persona`,
    name: p.name,
    url,
    jobTitle: p.headline ?? undefined,
    description: p.bio ?? undefined,
    address: p.city ? { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: 'ES' } : undefined,
    knowsAbout: p.techniques.map(techniqueLabel),
    affiliation: p.representedBy ? { '@type': 'Organization', name: p.representedBy } : undefined,
    mainEntityOfPage: url,
    subjectOf: artworks.slice(0, 24).map((a) => ({
      '@type': 'VisualArtwork',
      name: a.title,
      url: `${url}/obra/${a.id}`,
      image: a.images[0]?.medium,
      artMedium: techniqueLabel(a.technique),
      artform: 'Pintura',
      dateCreated: String(a.year),
      height: { '@type': 'Distance', name: `${a.heightCm} cm` },
      width: { '@type': 'Distance', name: `${a.widthCm} cm` },
      description: a.note ?? `${techniqueLabel(a.technique)}, ${fmtSize(a.widthCm, a.heightCm)}`,
      creator: { '@id': `${url}#persona` },
    })),
  };
}

function organizationLd(p: UserProfile) {
  const url = `${SITE_URL}/${p.handle}`;
  const org = p.organization;
  const expo = org?.currentExhibition;
  return {
    '@context': 'https://schema.org',
    // ArtGallery es un subtipo de Organization en schema.org; las instituciones usan Organization.
    '@type': p.role === 'galeria' ? 'ArtGallery' : 'Organization',
    name: p.name,
    url,
    description: p.bio ?? undefined,
    foundingDate: org?.since ? String(org.since) : undefined,
    address: org?.address || p.city
      ? { '@type': 'PostalAddress', streetAddress: org?.address ?? undefined, addressLocality: p.city ?? undefined, addressCountry: 'ES' }
      : undefined,
    openingHours: org?.openingHours ?? undefined,
    image: expo?.cover?.medium,
    event: expo
      ? {
          '@type': 'ExhibitionEvent',
          name: expo.title,
          startDate: expo.startsAt ?? undefined,
          endDate: expo.endsAt ?? undefined,
          location: { '@type': 'Place', name: p.name, address: org?.address ?? p.city ?? undefined },
          performer: { '@type': 'Person', name: expo.artist.name, url: `${SITE_URL}/${expo.artist.handle}` },
        }
      : undefined,
  };
}

export default async function ProfilePage({ params }: PageProps<'/[handle]'>) {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) notFound();

  if (isOrg(profile)) {
    return (
      <>
        <JsonLd data={organizationLd(profile)} />
        <ViewBeacon userId={profile.id} />
        <OrganizationProfile profile={profile} />
      </>
    );
  }

  const [artworks, series] = await Promise.all([getArtworks(profile.id), orFallback(getSeries(profile.id), [])]);
  return (
    <>
      <JsonLd data={personLd(profile, artworks)} />
      <ViewBeacon userId={profile.id} />
      <ArtistProfile profile={profile} artworks={artworks} series={series} />
    </>
  );
}

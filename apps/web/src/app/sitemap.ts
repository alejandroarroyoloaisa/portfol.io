import type { MetadataRoute } from 'next';
import type { CallSummary } from '@portfolio/schemas';
import { orFallback, publicApi } from '@/lib/api';
import { SITE_URL } from '@/lib/config';

export const revalidate = 3600;

/** Portada, convocatorias abiertas y perfiles públicos de las organizaciones y sus artistas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = publicApi(3600);
  const calls = await orFallback(api.calls.list(), [] as CallSummary[]);
  const orgHandles = Array.from(new Set(calls.map((c) => c.organization.handle)));
  const orgs = await Promise.all(orgHandles.map((h) => orFallback(api.users.get(h), null)));
  const artistHandles = new Set<string>();
  for (const o of orgs) for (const a of o?.organization?.artists ?? []) artistHandles.add(a.handle);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/convocatorias`, changeFrequency: 'daily', priority: 0.8 },
    ...calls.filter((c) => c.status === 'abierta').map((c) => ({ url: `${SITE_URL}/convocatorias/${c.id}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...orgHandles.map((h) => ({ url: `${SITE_URL}/${h}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...[...artistHandles].map((h) => ({ url: `${SITE_URL}/${h}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
}

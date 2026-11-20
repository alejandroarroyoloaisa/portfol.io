import { ApiRequestError } from '@portfolio/api-client';
import { APPLICATION_STATUS_LABELS } from '@portfolio/schemas';
import { SITE_URL } from '@/lib/config';
import { getActionApi } from '@/lib/session';

/** CSV de la selección (preseleccionadas y aceptadas); con ?todas=1 exporta todas las candidaturas. */
export async function GET(request: Request, { params }: RouteContext<'/panel/convocatorias/[id]/exportar'>) {
  const { id } = await params;
  const all = new URL(request.url).searchParams.get('todas') === '1';
  const api = await getActionApi();
  try {
    const [call, rows] = await Promise.all([api.calls.get(id), api.calls.applications(id)]);
    const picked = all ? rows : rows.filter((r) => r.status === 'preseleccionada' || r.status === 'aceptada');
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Artista', 'Alias', 'Ciudad', 'Estado', 'Encaje (%)', 'Obras', 'Enviada', 'Portfolio'].map(esc).join(';'),
      ...picked
        .sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
        .map((r) =>
          [
            r.artist.name, `@${r.artist.handle}`, r.artist.city, APPLICATION_STATUS_LABELS[r.status], r.match,
            r.artworks.map((a) => a.title).join(' / '), r.submittedAt?.slice(0, 10), `${SITE_URL}/${r.artist.handle}`,
          ].map(esc).join(';'),
        ),
    ];
    const slug = call.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return new Response(`﻿${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="seleccion-${slug || id}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const status = e instanceof ApiRequestError ? e.status : 502;
    if (status === 401) return Response.redirect(new URL('/acceder?caducada=1', request.url), 303);
    return new Response(status === 404 ? 'Convocatoria no encontrada' : 'No se ha podido exportar', { status });
  }
}

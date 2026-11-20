const DEFAULT_API = 'http://localhost:3000/api/v1';

/** API vista desde el servidor de Next. */
export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API;
/** API vista desde el navegador. */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API;
/** URL pública de la web (canónicas, Open Graph, sitemap). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

/** Segundos que se reutiliza una página pública antes de regenerarla (ISR). */
export const PUBLIC_REVALIDATE = 60;

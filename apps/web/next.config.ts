import type { NextConfig } from 'next';

/**
 * Se usa el modelo de renderizado «clásico» (sin Cache Components): el portfolio público
 * necesita devolver un 404 real para los alias inexistentes y el panel redirige en el
 * servidor antes de empezar a emitir HTML. Ver README → «Decisiones».
 */
const nextConfig: NextConfig = {
  // Paquetes del monorepo (compilados a CommonJS en dist/).
  transpilePackages: ['@portfolio/api-client', '@portfolio/schemas', '@portfolio/tokens'],
  images: {
    // La API ya sirve variantes redimensionadas (thumb/medium/large); nunca el original (RNF-13).
    unoptimized: true,
  },
  poweredByHeader: false,
};

export default nextConfig;

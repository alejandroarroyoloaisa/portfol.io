/**
 * Tokens de diseño del sistema visual «Recortes» (Sección 7 de la especificación).
 * Los comparten la app móvil (React Native) y la web (Next.js).
 */

export const colors = {
  crema: '#FFF4E0',
  tinta: '#141414',
  cobalto: '#2340E8',
  coral: '#FF6B4A',
  mostaza: '#F2B705',
  /** Verde corregido para texto crema encima (4,88:1, WCAG AA). El original #1F8A5B daba 3,98:1. */
  verde: '#1B7A50',
  arena: '#E8DCC4',
  gris: '#8A7F6E',
  blanco: '#FFFFFF',
  /** Coral oscurecido para texto sobre crema (4,85:1). */
  coralTexto: '#C23D17',
  /** Rojo de la anotación manuscrita. */
  anotacion: '#D9481F',
  cinta: 'rgba(242,183,5,0.65)',
} as const;

export type ColorName = keyof typeof colors;

/** Colores de fondo de los avatares, en orden de rotación. */
export const avatarColors: ColorName[] = ['verde', 'cobalto', 'coral', 'mostaza', 'tinta'];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[avatarColors[h % avatarColors.length]];
}

/** Color del texto que contrasta con un fondo de la paleta. */
export function onColor(bg: string): string {
  const dark = [colors.tinta, colors.cobalto, colors.verde];
  return dark.includes(bg as never) ? colors.crema : colors.tinta;
}

export const fonts = {
  /** Titulares y texto: Bricolage Grotesque. */
  display: 'BricolageGrotesque_800ExtraBold',
  bold: 'BricolageGrotesque_700Bold',
  body: 'BricolageGrotesque_500Medium',
  /** Anotaciones manuscritas: Caveat. */
  hand: 'Caveat_700Bold',
  handSemi: 'Caveat_600SemiBold',
} as const;

/** Familias para CSS (web). */
export const cssFonts = {
  sans: "'Bricolage Grotesque', system-ui, sans-serif",
  hand: "Caveat, cursive",
  googleFontsUrl:
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Caveat:wght@600;700&display=swap',
} as const;

export const type = {
  hero: { size: 44, lineHeight: 40, letterSpacing: -1.3 },
  h1: { size: 38, lineHeight: 38, letterSpacing: -1.1 },
  h2: { size: 30, lineHeight: 30, letterSpacing: -0.9 },
  h3: { size: 22, lineHeight: 24, letterSpacing: -0.5 },
  body: { size: 14, lineHeight: 20 },
  small: { size: 12, lineHeight: 16 },
  hand: { size: 24, lineHeight: 26 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 12, pill: 999 } as const;
/** Grosor del trazo de tinta de botones y chips. */
export const stroke = 2;
/** Inclinaciones de los «recortes» (grados). */
export const tilt = { left: -1.2, right: 2, soft: -0.6 } as const;
/** Área táctil mínima (RNF-05, WCAG 2.2). */
export const touchTarget = 44;

/** Colores de estado de una solicitud (coinciden con la Figura de estados). */
export const applicationStatusColors: Record<string, { bg: string; fg: string }> = {
  borrador: { bg: colors.blanco, fg: colors.tinta },
  enviada: { bg: colors.cobalto, fg: colors.crema },
  en_revision: { bg: colors.mostaza, fg: colors.tinta },
  preseleccionada: { bg: '#8FC7A9', fg: colors.tinta },
  aceptada: { bg: colors.verde, fg: colors.crema },
  no_seleccionada: { bg: colors.arena, fg: colors.tinta },
  retirada: { bg: '#E5E1DA', fg: colors.tinta },
};

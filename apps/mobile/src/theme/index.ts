/**
 * Tema de la app: reexporta los tokens del sistema visual «Recortes» (@portfolio/tokens)
 * y añade los valores derivados que solo necesita React Native.
 */
import {
  applicationStatusColors, avatarColor, colors as baseColors, fonts, onColor, radius, space, stroke, tilt, touchTarget,
  type as typeScale,
} from '@portfolio/tokens';

export const colors = {
  ...baseColors,
  /** Pista de los interruptores apagados y puntos inactivos. */
  pista: '#B9AE9A',
  /** Pared de la sala virtual. */
  pared: '#EFE6D2',
  /** Suelo de la sala virtual. */
  suelo: '#C9B89A',
  /** Fondo apagado (solicitudes no seleccionadas). */
  apagado: '#D8CDB6',
  /** Texto apagado sobre fondos claros (contraste ≥ 4,5:1 sobre crema). */
  tintaSuave: '#4A4438',
  /** Fondo oscurecido de las hojas modales. */
  velo: 'rgba(20,20,20,0.55)',
} as const;

export { applicationStatusColors, avatarColor, fonts, onColor, radius, space, stroke, tilt, touchTarget, typeScale };

/** Sombras de los «recortes» (boxShadow, admitido por React Native ≥ 0.76 y por la web). */
export const shadows = {
  card: '0px 2px 0px rgba(20,20,20,0.08), 0px 10px 22px rgba(20,20,20,0.10)',
  polaroid: '0px 8px 18px rgba(20,20,20,0.14)',
  soft: '0px 4px 10px rgba(20,20,20,0.08)',
  deep: '0px 10px 24px rgba(0,0,0,0.30)',
  wall: '0px 18px 30px rgba(20,20,20,0.25)',
} as const;

/** Rotación como transformación de estilo. */
export const rotate = (deg: number) => ({ transform: [{ rotate: `${deg}deg` }] });

/** Interletraje de los titulares (≈ −0,03 em). */
export const tight = (size: number, em = -0.03) => Math.round(size * em * 10) / 10;

/** Rotaciones alternas para listas de recortes, de forma determinista. */
const TILTS = [-1.2, 1.5, -0.8, 2, -1.5, 1, -2, 0.8];
export const tiltAt = (i: number, scale = 1) => TILTS[i % TILTS.length] * scale;

/** Formas orgánicas para avatares y cifras (radios por esquina). */
export type Shape = 'circle' | 'blob' | 'leaf' | 'square';
export function shapeRadii(shape: Shape, size: number) {
  switch (shape) {
    case 'circle':
      return { borderRadius: size / 2 };
    case 'blob':
      return {
        borderTopLeftRadius: size * 0.46, borderTopRightRadius: size * 0.54,
        borderBottomRightRadius: size * 0.5, borderBottomLeftRadius: size * 0.5,
      };
    case 'leaf':
      return {
        borderTopLeftRadius: size * 0.4, borderTopRightRadius: size * 0.6,
        borderBottomRightRadius: size * 0.4, borderBottomLeftRadius: size * 0.6,
      };
    case 'square':
      return { borderRadius: Math.round(size * 0.26) };
  }
}

/** Color de fondo de cada tipo de convocatoria (Convocatorias). */
export const callTypeColors: Record<string, { bg: string; fg: string; accent: string }> = {
  premio: { bg: baseColors.coral, fg: baseColors.tinta, accent: baseColors.tinta },
  exposicion: { bg: baseColors.blanco, fg: baseColors.tinta, accent: baseColors.cobalto },
  residencia: { bg: baseColors.verde, fg: baseColors.crema, accent: baseColors.crema },
  beca: { bg: baseColors.mostaza, fg: baseColors.tinta, accent: baseColors.tinta },
  feria: { bg: baseColors.cobalto, fg: baseColors.crema, accent: baseColors.mostaza },
};

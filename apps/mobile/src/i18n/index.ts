import {
  APPLICATION_STATUS_LABELS, ARTWORK_STATUS_LABELS, CALL_TYPE_LABELS, FORMAT_LABELS, ROLE_LABELS, SCOPE_LABELS,
  TECHNIQUE_LABELS, THEME_LABELS,
} from '@portfolio/schemas';
import { es } from './es';

/** Idioma activo. Por ahora solo español (RNF-10: los textos están externalizados). */
export const t = es;
export const locale = 'es-ES';

/** Etiquetas de los catálogos del dominio (vienen del paquete compartido). */
export const labels = {
  technique: TECHNIQUE_LABELS,
  theme: THEME_LABELS,
  role: ROLE_LABELS,
  artworkStatus: ARTWORK_STATUS_LABELS,
  callType: CALL_TYPE_LABELS,
  scope: SCOPE_LABELS,
  format: FORMAT_LABELS,
  applicationStatus: APPLICATION_STATUS_LABELS,
};

/** Primera letra en mayúscula («óleo» → «Óleo»). */
export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

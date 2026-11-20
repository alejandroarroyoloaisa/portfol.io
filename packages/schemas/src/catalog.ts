/** Catálogos del dominio. Las claves se guardan en base de datos; las etiquetas se muestran. */

export const ROLES = ['artista', 'galeria', 'coleccionista', 'institucion', 'admin'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  artista: 'Artista',
  galeria: 'Galería o comisariado',
  coleccionista: 'Coleccionista',
  institucion: 'Institución',
  admin: 'Administración',
};
/** Roles que se pueden elegir al registrarse (RF-03). */
export const SIGNUP_ROLES = ['artista', 'galeria', 'coleccionista', 'institucion'] as const;
export const ORG_ROLES: Role[] = ['galeria', 'institucion'];

export const TECHNIQUES = [
  'oleo', 'acrilico', 'acuarela', 'gouache', 'temple', 'tecnica_mixta',
  'collage', 'grabado', 'dibujo', 'pastel', 'digital',
] as const;
export type Technique = (typeof TECHNIQUES)[number];
export const TECHNIQUE_LABELS: Record<Technique, string> = {
  oleo: 'óleo', acrilico: 'acrílico', acuarela: 'acuarela', gouache: 'gouache', temple: 'temple',
  tecnica_mixta: 'técnica mixta', collage: 'collage', grabado: 'grabado', dibujo: 'dibujo',
  pastel: 'pastel', digital: 'pintura digital',
};

export const THEMES = [
  'paisaje', 'retrato', 'abstraccion', 'figuracion', 'bodegon', 'urbano',
  'mar', 'interior', 'cuerpo', 'naturaleza',
] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_LABELS: Record<Theme, string> = {
  paisaje: 'paisaje', retrato: 'retrato', abstraccion: 'abstracción', figuracion: 'figuración',
  bodegon: 'bodegón', urbano: 'urbano', mar: 'mar', interior: 'interior', cuerpo: 'cuerpo',
  naturaleza: 'naturaleza',
};

export const ARTWORK_STATUS = ['exposicion', 'privada', 'proceso'] as const;
export type ArtworkStatus = (typeof ARTWORK_STATUS)[number];
export const ARTWORK_STATUS_LABELS: Record<ArtworkStatus, string> = {
  exposicion: 'para exposición', privada: 'colección privada', proceso: 'en proceso',
};

/** Formatos por lado mayor (filtro RF-20). */
export const FORMATS = ['pequeno', 'mediano', 'grande'] as const;
export type Format = (typeof FORMATS)[number];
export const FORMAT_LABELS: Record<Format, string> = {
  pequeno: 'pequeño (< 50 cm)', mediano: 'mediano (50–120 cm)', grande: 'grande (> 120 cm)',
};
export function formatOf(widthCm: number, heightCm: number): Format {
  const side = Math.max(widthCm, heightCm);
  return side < 50 ? 'pequeno' : side <= 120 ? 'mediano' : 'grande';
}

export const CALL_TYPES = ['premio', 'exposicion', 'residencia', 'beca', 'feria'] as const;
export type CallType = (typeof CALL_TYPES)[number];
export const CALL_TYPE_LABELS: Record<CallType, string> = {
  premio: 'premio', exposicion: 'exposición colectiva', residencia: 'residencia', beca: 'beca', feria: 'feria',
};

export const SCOPES = ['local', 'regional', 'nacional', 'internacional'] as const;
export type Scope = (typeof SCOPES)[number];
export const SCOPE_LABELS: Record<Scope, string> = {
  local: 'Local', regional: 'Regional', nacional: 'Nacional', internacional: 'Internacional',
};

export const CALL_STATUS = ['borrador', 'abierta', 'cerrada', 'resuelta'] as const;
export type CallStatus = (typeof CALL_STATUS)[number];

export const NOTIFICATION_TYPES = [
  'convocatoria_encaje', 'conexion_solicitada', 'conexion_aceptada', 'visita_perfil',
  'valoraciones', 'validacion_tecnica', 'expo_abierta', 'solicitud_estado', 'mensaje', 'comentario',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Preferencias de avisos configurables (RF-31, RF-33). */
export const NOTIFICATION_PREFS = ['mensajes', 'convocatorias', 'red', 'solicitudes', 'actividad'] as const;
export type NotificationPref = (typeof NOTIFICATION_PREFS)[number];

export const REPORT_REASONS = ['plagio', 'contenido_inapropiado', 'spam', 'suplantacion', 'otro'] as const;

/** Validaciones de entrada compartidas por la API (servidor) y los formularios (cliente, RHF + Zod). */
import { z } from 'zod';
import {
  ARTWORK_STATUS, CALL_STATUS, CALL_TYPES, FORMATS, NOTIFICATION_PREFS, REPORT_REASONS, SCOPES,
  SIGNUP_ROLES, TECHNIQUES, THEMES,
} from './catalog';
import { APPLICATION_STATUS } from './status';

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const email = z.string().trim().toLowerCase().pipe(z.email({ message: 'Correo no válido' }));
const password = z.string().min(8, 'Mínimo 8 caracteres').max(128);
const handle = z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/, 'Solo letras, números, punto y guion bajo (3–30)');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(80),
  email,
  password,
  role: z.enum(SIGNUP_ROLES).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1, 'Escribe la contraseña') });
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(10), password });

export const locationSchema = z.object({
  city: z.string().trim().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  country: z.string().length(2).default('ES'),
});

export const onboardingSchema = z.object({
  role: z.enum(SIGNUP_ROLES).optional(),
  techniques: z.array(z.enum(TECHNIQUES)).max(8).default([]),
  themes: z.array(z.enum(THEMES)).max(8).default([]),
  location: locationSchema.optional(),
  acceptsCommissions: z.boolean().optional(),
  openToCalls: z.boolean().optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const careerItemSchema = z.object({ year: z.number().int().min(1900).max(2100), text: z.string().trim().min(2).max(160) });

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  handle: handle.optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  location: locationSchema.optional(),
  acceptsCommissions: z.boolean().optional(),
  openToCalls: z.boolean().optional(),
  techniques: z.array(z.enum(TECHNIQUES)).max(8).optional(),
  themes: z.array(z.enum(THEMES)).max(8).optional(),
  career: z.array(careerItemSchema).max(30).optional(),
  representedBy: z.string().trim().max(80).nullable().optional(),
  avatarKey: z.string().max(200).nullable().optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const settingsSchema = z.object({
  notifications: z.partialRecord(z.enum(NOTIFICATION_PREFS), z.boolean()).optional(),
  privateProfile: z.boolean().optional(),
  showCity: z.boolean().optional(),
  watermark: z.boolean().optional(),
  allowMessagesFrom: z.enum(['todos', 'conexiones']).optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

const currentYear = new Date().getFullYear();
export const createArtworkSchema = z.object({
  title: z.string().trim().min(1, 'Ponle un título').max(120),
  technique: z.enum(TECHNIQUES),
  widthCm: z.number().positive('Mayor que 0').max(2000),
  heightCm: z.number().positive('Mayor que 0').max(2000),
  year: z.number().int().min(1900).max(currentYear + 1),
  status: z.enum(ARTWORK_STATUS),
  note: z.string().trim().max(600).optional(),
  annotation: z.string().trim().max(40).optional(),
  themes: z.array(z.enum(THEMES)).max(5).default([]),
  seriesId: z.string().uuid().nullable().optional(),
  newSeriesTitle: z.string().trim().min(2).max(80).optional(),
  imageKeys: z.array(z.string().max(200)).max(8).default([]),
  draft: z.boolean().default(false),
});
export type CreateArtworkInput = z.input<typeof createArtworkSchema>;
export const updateArtworkSchema = createArtworkSchema.partial();
export type UpdateArtworkInput = z.input<typeof updateArtworkSchema>;

export const commentSchema = z.object({ text: z.string().trim().min(1).max(500) });

/** Booleano de consulta: «true»/«1» → true; «false»/«0» → false (z.coerce trataría «false» como true). */
const qbool = z.preprocess((v) => (v === undefined || v === '' ? undefined : v === true || v === 'true' || v === '1'), z.boolean().optional());

export const searchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  type: z.enum(['obras', 'artistas', 'galerias', 'todo']).default('todo'),
  technique: z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : String(v).split(',')), z.array(z.enum(TECHNIQUES)).optional()),
  format: z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : String(v).split(',')), z.array(z.enum(FORMATS)).optional()),
  km: z.coerce.number().int().min(1).max(2000).optional(),
  acceptsCommissions: qbool,
  openToCalls: qbool,
  /** Solo obras disponibles para exposición. */
  available: qbool,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchInput = z.input<typeof searchSchema>;

export const createCallSchema = z.object({
  type: z.enum(CALL_TYPES),
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().max(400).optional(),
  edition: z.string().trim().max(40).optional(),
  basesUrl: z.union([z.literal('').transform(() => null), z.url()]).nullable().optional(),
  prize: z.string().trim().max(60).optional(),
  places: z.number().int().positive().max(500).optional(),
  closesAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
  timeline: z.array(z.object({ date: z.string().max(20), text: z.string().max(120) })).max(10).default([]),
  requirements: z.array(z.string().trim().max(160)).max(10).default([]),
  scope: z.enum(SCOPES),
  city: z.string().trim().max(80).optional(),
  techniques: z.array(z.enum(TECHNIQUES)).max(11).default([]),
  themes: z.array(z.enum(THEMES)).max(10).default([]),
  maxArtworks: z.number().int().min(1).max(10).default(3),
  maxFormatCm: z.number().int().positive().max(1000).nullable().optional(),
  minYear: z.number().int().min(1900).max(2100).nullable().optional(),
  requiresCv: z.boolean().default(true),
  requiresDossier: z.boolean().default(true),
  status: z.enum(CALL_STATUS).default('abierta'),
});
export type CreateCallInput = z.input<typeof createCallSchema>;
export const updateCallSchema = createCallSchema.partial();
export type UpdateCallInput = z.input<typeof updateCallSchema>;

export const documentSchema = z.object({
  kind: z.enum(['cv', 'dossier', 'otro']),
  key: z.string().max(200),
  name: z.string().max(120),
  sizeBytes: z.number().int().nonnegative(),
});

export const createApplicationSchema = z.object({
  artworkIds: z.array(z.string().uuid()).max(10),
  letter: z.string().trim().max(3000).refine((s) => countWords(s) <= 300, 'Máximo 300 palabras').default(''),
  documents: z.array(documentSchema).max(5).default([]),
  /** true = enviar; false = guardar como borrador (RF-25). */
  submit: z.boolean().default(true),
});
export type CreateApplicationInput = z.input<typeof createApplicationSchema>;

export const updateApplicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUS),
  note: z.string().trim().max(400).optional(),
});
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

export const sendMessageSchema = z.object({
  text: z.string().trim().max(2000).default(''),
  artworkId: z.string().uuid().optional(),
}).refine((m) => m.text.length > 0 || !!m.artworkId, 'Mensaje vacío');
export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const startConversationSchema = z.object({
  userId: z.string().uuid(),
  callId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(2000).optional(),
  artworkId: z.string().uuid().optional(),
});
export type StartConversationInput = z.input<typeof startConversationSchema>;

export const reportSchema = z.object({
  targetType: z.enum(['obra', 'usuario', 'comentario', 'mensaje']),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const pushTokenSchema = z.object({ token: z.string().min(10).max(300), platform: z.enum(['ios', 'android', 'web']) });
export const statsPeriodSchema = z.object({ period: z.enum(['7d', '30d', '90d']).default('30d') });
export type StatsPeriod = z.infer<typeof statsPeriodSchema>['period'];

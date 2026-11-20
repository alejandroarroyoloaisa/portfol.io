/** Tipos de las respuestas de la API (contrato entre apps/api y los clientes). */
import type {
  ArtworkStatus, CallStatus, CallType, NotificationPref, NotificationType, Role, Scope, Technique, Theme,
} from './catalog';
import type { ApplicationStatus } from './status';

export type ISODate = string;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Segundos hasta que caduca el token de acceso. */
  expiresIn: number;
}

export interface AuthResponse extends Tokens {
  user: Me;
}

/** Imagen de una obra: nunca se sirve el original (RNF-13). */
export interface ImageVariants {
  thumb: string;
  medium: string;
  large: string;
  width: number;
  height: number;
  /** Color dominante para el marcador de posición durante la carga progresiva. */
  color: string;
}

export interface UserSummary {
  id: string;
  handle: string;
  name: string;
  role: Role;
  headline: string | null;
  city: string | null;
  avatarUrl: string | null;
  initials: string;
  verified: boolean;
}

export interface CareerItem { year: number; text: string }

export type ConnectionState = 'none' | 'pending_out' | 'pending_in' | 'connected' | 'self';

export interface UserProfile extends UserSummary {
  bio: string | null;
  techniques: Technique[];
  themes: Theme[];
  acceptsCommissions: boolean;
  openToCalls: boolean;
  representedBy: string | null;
  career: CareerItem[];
  counts: { artworks: number; connections: number; exhibitions: number; followers: number };
  connection: ConnectionState;
  following: boolean;
  /** Técnicas validadas por otros profesionales (RF-16): técnica → nº de validaciones. */
  endorsements: Partial<Record<Technique, number>>;
  endorsedByMe: Technique[];
  publicUrl: string;
  /** Solo organizaciones. */
  organization?: OrganizationInfo;
}

export interface OrganizationInfo {
  since: number | null;
  address: string | null;
  openingHours: string | null;
  artists: UserSummary[];
  artistsTotal: number;
  openCalls: CallSummary[];
  currentExhibition: ExhibitionSummary | null;
}

export interface Me extends UserProfile {
  email: string;
  onboarded: boolean;
  location: { city: string; lat: number; lng: number; country: string } | null;
  settings: Settings;
  /** Porcentaje de perfil completado. */
  completion: number;
  orgId: string | null;
}

export interface Settings {
  notifications: Record<NotificationPref, boolean>;
  privateProfile: boolean;
  showCity: boolean;
  watermark: boolean;
  allowMessagesFrom: 'todos' | 'conexiones';
}

export interface SeriesSummary { id: string; title: string; count: number }

export interface Artwork {
  id: string;
  title: string;
  artist: UserSummary;
  technique: Technique;
  /** Ancho y alto en centímetros (se muestran como «ancho × alto»). */
  widthCm: number;
  heightCm: number;
  year: number;
  status: ArtworkStatus;
  note: string | null;
  annotation: string | null;
  themes: Theme[];
  series: (SeriesSummary & { position: number }) | null;
  images: ImageVariants[];
  likes: number;
  comments: number;
  saves: number;
  views: number;
  likedByMe: boolean;
  savedByMe: boolean;
  draft: boolean;
  publishedAt: ISODate | null;
  createdAt: ISODate;
}

export interface Comment { id: string; author: UserSummary; text: string; createdAt: ISODate }

export type FeedItem =
  | { kind: 'artwork'; id: string; artwork: Artwork; createdAt: ISODate }
  | { kind: 'calls'; id: string; count: number; firstClosesAt: ISODate | null; createdAt: ISODate }
  | { kind: 'suggestion'; id: string; users: UserSummary[]; createdAt: ISODate };

export interface SearchResult {
  artworks: Artwork[];
  artists: (UserSummary & { distanceKm: number | null; acceptsCommissions: boolean; techniques: Technique[] })[];
  galleries: (UserSummary & { distanceKm: number | null })[];
  /** Número de resultados de esta página. */
  total: number;
  /** Cursor de la página siguiente (solo cuando se busca un único tipo). */
  nextCursor: string | null;
}

export interface MatchInfo { score: number; matches: boolean; reason: string }

export interface CallSummary {
  id: string;
  type: CallType;
  title: string;
  organization: UserSummary;
  city: string | null;
  prize: string | null;
  places: number | null;
  closesAt: ISODate;
  daysLeft: number;
  status: CallStatus;
  match: MatchInfo | null;
  /** Estado de mi solicitud, si la hay. */
  myApplication: { id: string; status: ApplicationStatus } | null;
}

export interface CallDetail extends CallSummary {
  summary: string | null;
  edition: string | null;
  basesUrl: string | null;
  scope: Scope;
  techniques: Technique[];
  themes: Theme[];
  maxArtworks: number;
  maxFormatCm: number | null;
  minYear: number | null;
  requiresCv: boolean;
  requiresDossier: boolean;
  requirements: string[];
  timeline: { date: string; text: string }[];
  applicationsCount: number;
}

export interface ApplicationDocument { kind: 'cv' | 'dossier' | 'otro'; key: string; name: string; sizeBytes: number; url?: string }

export interface ApplicationHistoryItem { status: ApplicationStatus; at: ISODate; by: string; byName?: string; note?: string }

export interface Application {
  id: string;
  call: CallSummary;
  artist: UserSummary;
  status: ApplicationStatus;
  match: number | null;
  letter: string;
  artworks: Artwork[];
  documents: ApplicationDocument[];
  history: ApplicationHistoryItem[];
  /** Nota del jurado o de la organización visible para la artista. */
  feedback: string | null;
  submittedAt: ISODate | null;
  updatedAt: ISODate;
  /** Hay mensajes de la organización sobre esta solicitud. */
  conversationId: string | null;
}

export interface ApplicationsOverview {
  items: Application[];
  counts: { total: number; inProgress: number; acceptedThisYear: number; drafts: number };
}

export interface Message {
  id: string;
  conversationId: string;
  author: UserSummary;
  text: string;
  artwork: Artwork | null;
  sentAt: ISODate;
  readAt: ISODate | null;
}

export interface Conversation {
  id: string;
  other: UserSummary;
  lastMessage: Pick<Message, 'text' | 'sentAt'> & { mine: boolean } | null;
  unread: number;
  context: { callId: string; title: string } | null;
  updatedAt: ISODate;
}

export interface Notification {
  id: string;
  type: NotificationType;
  actor: UserSummary | null;
  text: string;
  /** Ruta interna a la que lleva el aviso, p. ej. «call:<id>», «user:<handle>». */
  link: string | null;
  read: boolean;
  createdAt: ISODate;
}

export interface ConnectionRequest {
  id: string;
  user: UserSummary;
  mutual: number;
  createdAt: ISODate;
}

export interface NetworkOverview {
  total: number;
  professionals: number;
  requests: ConnectionRequest[];
  suggestions: (UserSummary & { reason: string })[];
}

export interface Exhibition {
  id: string;
  title: string;
  artist: UserSummary;
  organization: UserSummary | null;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  virtual: boolean;
  artworks: Artwork[];
}
export type ExhibitionSummary = Omit<Exhibition, 'artworks'> & { cover: ImageVariants | null };

export interface Stats {
  period: '7d' | '30d' | '90d';
  visits: number;
  visitsDelta: number;
  views: number;
  saves: number;
  contacts: number;
  series: { label: string; value: number }[];
  audience: { role: Role; pct: number }[];
  topArtworks: { id: string; title: string; views: number; image: ImageVariants | null }[];
}

export interface Summary {
  unreadMessages: number;
  unreadNotifications: number;
  applicationsInProgress: number;
  openCalls: number;
  matchingCalls: number;
  pendingConnections: number;
}

export interface UploadResult { key: string; url: string; image?: ImageVariants; name: string; sizeBytes: number }

/** Panel de organización (web). */
export interface OrgApplicationRow {
  id: string;
  artist: UserSummary;
  status: ApplicationStatus;
  match: number | null;
  artworks: Artwork[];
  submittedAt: ISODate | null;
  letterExcerpt: string;
}

export interface OrgDashboard {
  organization: UserSummary;
  calls: (CallSummary & { applicationsCount: number; byStatus: Partial<Record<ApplicationStatus, number>> })[];
}

export interface ApiError { statusCode: number; message: string; errors?: { path: string; message: string }[] }

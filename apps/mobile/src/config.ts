import Constants from 'expo-constants';

/**
 * URL base de la API. Prioridad:
 * 1. Variable de entorno EXPO_PUBLIC_API_URL (se incrusta al empaquetar).
 * 2. app.json → expo.extra.apiUrl.
 * 3. http://localhost:3000/api/v1 (simulador iOS y web).
 *
 * En un móvil físico hay que usar la IP de la red local del ordenador (p. ej. http://192.168.1.20:3000/api/v1)
 * y en el emulador de Android, http://10.0.2.2:3000/api/v1.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || 'http://localhost:3000/api/v1').replace(/\/$/, '');

/** Origen del servidor (sin /api/v1), usado por Socket.IO y para reescribir las URL de imágenes. */
export const API_ORIGIN = API_URL.replace(/\/api\/v\d+$/, '');

/** Espacio de nombres del tiempo real. */
export const WS_URL = `${API_ORIGIN}/ws`;

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/;

/**
 * La API devuelve las imágenes con su URL pública (por defecto http://localhost:3000/media/…).
 * Si la app habla con la API por otra dirección (móvil físico, emulador), se reescribe el origen
 * para que las imágenes también carguen.
 */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (LOCAL_ORIGIN.test(API_ORIGIN)) return url;
  return url.replace(LOCAL_ORIGIN, API_ORIGIN);
}

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

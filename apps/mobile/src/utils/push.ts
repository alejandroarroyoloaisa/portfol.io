/**
 * Notificaciones push (RF-31). Todo está protegido para que nunca rompa la app:
 * en la web, en simuladores y en Expo Go (Android, SDK ≥ 53) las push remotas no existen,
 * así que se devuelve «unavailable» sin cargar el módulo.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

export type PushResult = 'enabled' | 'denied' | 'unavailable';

type NotificationsModule = typeof import('expo-notifications');

function loadModule(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** Pide permiso (si `ask`) y registra el token del dispositivo en la API. */
export async function registerForPush(ask: boolean): Promise<PushResult> {
  const N = loadModule();
  if (!N) return 'unavailable';
  try {
    let perm = await N.getPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain) perm = await N.requestPermissionsAsync();
    if (!perm.granted) return 'denied';
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', { name: 'Portfol.io', importance: N.AndroidImportance.DEFAULT });
    }
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
      ?? Constants.easConfig?.projectId;
    const token = projectId
      ? (await N.getExpoPushTokenAsync({ projectId })).data
      : String((await N.getDevicePushTokenAsync()).data);
    await api.me.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    return 'enabled';
  } catch {
    return 'unavailable';
  }
}

/** Escucha los toques en una notificación push para navegar a su enlace («call:<id>», …). */
export function listenPushTaps(onLink: (link: string) => void): () => void {
  const N = loadModule();
  if (!N) return () => undefined;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
    });
    const sub = N.addNotificationResponseReceivedListener((r) => {
      const link = (r.notification.request.content.data as { link?: string } | undefined)?.link;
      if (link) onLink(link);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}

/**
 * Navegación a partir del enlace interno de un aviso («call:<id>», «user:<handle>», …),
 * usado por la pantalla de avisos y por los toques en notificaciones push.
 */
import { createNavigationContainerRef, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Nav = Pick<NavigationProp<RootStackParamList>, 'navigate'>;

export function openLink(nav: Nav, link: string | null | undefined, myHandle?: string): boolean {
  if (!link) return false;
  const i = link.indexOf(':');
  const kind = i === -1 ? link : link.slice(0, i);
  const id = i === -1 ? '' : link.slice(i + 1);
  switch (kind) {
    case 'call': nav.navigate('CallDetail', { id }); return true;
    case 'user':
      if (id && id === myHandle) nav.navigate('Tabs', { screen: 'MyProfile' });
      else nav.navigate('Profile', { handle: id });
      return true;
    case 'artwork': nav.navigate('Artwork', { id }); return true;
    case 'application': nav.navigate('Applications'); return true;
    case 'conversation': nav.navigate('Chat', { conversationId: id }); return true;
    case 'series': nav.navigate('Exhibition', { seriesId: id }); return true;
    case 'exhibition': nav.navigate('Exhibition', { exhibitionId: id }); return true;
    case 'network': nav.navigate('Network'); return true;
    case 'stats': nav.navigate('Stats'); return true;
    default: return false;
  }
}

/** Para avisos que llegan fuera de una pantalla (push). */
export function openLinkFromRoot(link: string) {
  if (navigationRef.isReady()) openLink(navigationRef as unknown as Nav, link);
}

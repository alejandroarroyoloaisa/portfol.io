import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useCallback } from 'react';
import { useMe } from '../api/hooks/me';
import { openLink } from './links';
import type { RootStackParamList } from './types';

export type AppNavigation = NavigationProp<RootStackParamList>;

/** Navegación tipada con atajos: abrir un perfil (el propio va a la pestaña Mi perfil) o un enlace interno. */
export function useAppNavigation() {
  const nav = useNavigation<AppNavigation>();
  const myHandle = useMe().data?.handle;
  const openUser = useCallback((handle: string) => openLink(nav, `user:${handle}`, myHandle), [nav, myHandle]);
  const open = useCallback((link: string | null) => openLink(nav, link, myHandle), [nav, myHandle]);
  return { nav, openUser, open };
}

/** Avisos breves en pantalla («Borrador guardado», errores de acciones rápidas). */
import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors } from '../theme';
import { errorMessage } from '../utils/errors';
import { Txt } from './Text';

interface ToastState {
  message: string | null;
  tone: 'ok' | 'error';
  id: number;
  show: (message: string, tone?: 'ok' | 'error') => void;
  hide: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'ok',
  id: 0,
  show: (message, tone = 'ok') => {
    set((s) => ({ message, tone, id: s.id + 1 }));
    AccessibilityInfo.announceForAccessibility(message);
  },
  hide: () => set({ message: null }),
}));

export const toast = {
  ok: (m: string) => useToastStore.getState().show(m, 'ok'),
  error: (e: unknown) => useToastStore.getState().show(typeof e === 'string' ? e : errorMessage(e), 'error'),
};

export function Toaster() {
  const { message, tone, id, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 3200);
    return () => clearTimeout(timer);
  }, [id, message, hide]);
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center', zIndex: 1000 }}
    >
      <View
        style={{
          paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18, maxWidth: 420,
          backgroundColor: tone === 'ok' ? colors.tinta : colors.coral, transform: [{ rotate: '-1deg' }],
          boxShadow: '0px 8px 18px rgba(20,20,20,0.25)',
        }}
      >
        <Txt size={15} weight="bold" color={tone === 'ok' ? colors.crema : colors.tinta}>{message}</Txt>
      </View>
    </View>
  );
}

/**
 * Convocatorias guardadas («Guardar convocatoria» del detalle). La API no tiene este recurso,
 * así que se guardan en el dispositivo (AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SavedCallsState {
  ids: string[];
  toggle: (id: string) => void;
}

export const useSavedCalls = create<SavedCallsState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })),
    }),
    { name: 'portfolio.savedCalls', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

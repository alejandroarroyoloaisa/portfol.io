import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacén seguro (Keychain / Keystore) para los tokens. En la web no existe SecureStore,
 * así que se usa localStorage.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (value == null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } catch { /* almacenamiento bloqueado */ }
      return;
    }
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  },
};

/** Almacén local no sensible (caché sin conexión y borradores, RNF-12). */
export const localStore = {
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    try {
      if (value == null) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch { /* sin espacio o bloqueado: no es crítico */ }
  },
  async remove(key: string) {
    try { await AsyncStorage.removeItem(key); } catch { /* idem */ }
  },
  async clearPrefix(prefix: string) {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch { /* idem */ }
  },
};

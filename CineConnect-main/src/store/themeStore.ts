import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'cc_theme_preference';

interface ThemeState {
  /** What the user picked. 'system' follows the OS appearance setting. */
  preference: ThemePreference;
  /** True until we've read the persisted preference from storage. */
  hydrating: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  hydrating: true,

  setPreference: async (preference) => {
    set({ preference });
    await AsyncStorage.setItem(THEME_KEY, preference);
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ preference: stored });
      }
    } catch {
      // Corrupted storage — fall back to 'system'.
    } finally {
      set({ hydrating: false });
    }
  },
}));

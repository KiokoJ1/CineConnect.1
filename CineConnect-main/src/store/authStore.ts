import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Role, User } from '@/types';

const TOKEN_KEY = 'cc_token';
const REFRESH_KEY = 'cc_refresh_token';
const USER_KEY = 'cc_user';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  /** True until we have finished reading persisted auth from storage. */
  hydrating: boolean;
  setAuth: (params: {
    user: User;
    token: string;
    refreshToken?: string | null;
  }) => Promise<void>;
  setToken: (token: string, refreshToken?: string | null) => Promise<void>;
  /** Updates the active role in-place (no re-login) after a successful PATCH /api/auth/active-role, and persists it so it survives an app restart. */
  setActiveRole: (updatedUser: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  hydrating: true,

  setAuth: async ({ user, token, refreshToken }) => {
    set({ user, token, refreshToken: refreshToken ?? get().refreshToken, role: user.role });
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  },

  setToken: async (token, refreshToken) => {
    set({ token, refreshToken: refreshToken ?? get().refreshToken });
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  },

  setActiveRole: async (updatedUser) => {
    set({ user: updatedUser, role: updatedUser.role });
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  },

  clearAuth: async () => {
    set({ user: null, token: null, refreshToken: null, role: null });
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  },

  hydrate: async () => {
    try {
      const [[, token], [, refreshToken], [, userRaw]] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        REFRESH_KEY,
        USER_KEY,
      ]);
      if (token && userRaw) {
        const user = JSON.parse(userRaw) as User;
        set({ user, token, refreshToken, role: user.role });
      }
    } catch {
      // Corrupted storage — start signed out.
    } finally {
      set({ hydrating: false });
    }
  },
}));

/** Non-hook accessors for use inside the axios interceptor (outside React). */
export const authStorage = {
  getToken: () => AsyncStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => AsyncStorage.getItem(REFRESH_KEY),
};

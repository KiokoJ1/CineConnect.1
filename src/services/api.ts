import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

import { authStorage, useAuthStore } from '@/store/authStore';

const BACKEND_PORT = 5000;

/**
 * On a physical device, `localhost` refers to the device itself, not the
 * computer running the backend — a classic Expo gotcha. In dev, Expo's
 * bundler host (e.g. "192.168.1.42:8081") tells us the LAN IP of the machine
 * that served the JS bundle, which is normally the same machine running the
 * backend. We reuse that IP so simulators, emulators, and physical phones on
 * the same Wi-Fi all "just work" without hand-editing .env every time the
 * network changes.
 *
 * An explicit EXPO_PUBLIC_API_URL always wins (e.g. pointing at a staging
 * server), and everything falls back to localhost if detection fails.
 */
function resolveBaseURL(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ?? (Constants as any)?.expoGoConfig?.debuggerHost;

  if (__DEV__ && hostUri) {
    const lanHost = hostUri.split(':')[0];
    if (lanHost && lanHost !== 'localhost') {
      return `http://${lanHost}:${BACKEND_PORT}`;
    }
  }

  return `http://localhost:${BACKEND_PORT}`;
}

export const baseURL = resolveBaseURL();

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT from storage to every request.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await authStorage.getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

// Single in-flight refresh shared by all queued 401s.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await authStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Use a bare client so we don't recurse through this interceptor.
    const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken });
    const newToken: string | undefined = data?.token ?? data?.accessToken;
    if (!newToken) return null;
    await useAuthStore.getState().setToken(newToken, data?.refreshToken ?? refreshToken);
    return newToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (RetriableConfig & InternalAxiosRequestConfig) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed — sign out. Routing reacts to the cleared store.
      await useAuthStore.getState().clearAuth();
      await AsyncStorage.removeItem('cc_token');
    }

    return Promise.reject(error);
  },
);

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

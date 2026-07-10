import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/useTheme';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

// Public routes that an unauthenticated user is allowed to see.
const PUBLIC_ROUTES = new Set(['index', 'onboarding', 'login', 'register', 'forgot-password']);

/** Redirect based on auth state once hydration has completed. */
function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { token, hydrating } = useAuthStore();

  useEffect(() => {
    if (hydrating) return;
    const root = segments[0] ?? 'index';
    const isPublic = PUBLIC_ROUTES.has(root);
    // Guard only kicks in for protected routes; the splash screen handles the
    // initial authenticated redirect so we don't fight it here.
    if (!token && !isPublic) {
      router.replace('/login');
    }
  }, [token, hydrating, segments, router]);
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  useAuthGuard();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppShell colors={colors} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Rendered inside QueryClientProvider so hooks needing query-client context (real-time notifications) can run. */
function AppShell({ colors }: { colors: { background: string } }) {
  useNotificationSocket();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="(freelancer)" />
      <Stack.Screen name="(producer)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

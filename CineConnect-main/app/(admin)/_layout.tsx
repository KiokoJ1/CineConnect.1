import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';

/**
 * Route-level guard: only an authenticated 'admin' role may see anything
 * under (admin). Without this, a freelancer/producer who knew the URL (or
 * hit the back button just right) could land on admin screens — there was
 * no check here at all, only the top-level "is there a token" guard in the
 * root layout. See ADMIN_FIX_REPORT.md.
 */
export default function AdminLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const { role, hydrating } = useAuthStore();

  useEffect(() => {
    if (hydrating) return;
    if (role !== 'admin') {
      router.replace(homeRouteForRole(role));
    }
  }, [hydrating, role, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

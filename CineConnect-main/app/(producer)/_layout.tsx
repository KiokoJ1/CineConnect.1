import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AppTabBar } from '@/components/AppTabBar';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';

// 'client' is a producer-equivalent role (see backend OWNER_ROLES) and
// shares this same tab group/screens — see src/utils/routing.ts.
const ALLOWED_ROLES = new Set(['producer', 'client']);

export default function ProducerTabsLayout() {
  const router = useRouter();
  const { role, hydrating } = useAuthStore();

  // Same pattern as (admin)/_layout.tsx: if the active role is switched away
  // from producer/client while this tab group is on screen (or someone
  // deep-links/back-buttons in), redirect out immediately instead of
  // leaving producer-only features visible to the wrong role.
  useEffect(() => {
    if (hydrating) return;
    if (role && !ALLOWED_ROLES.has(role)) {
      router.replace(homeRouteForRole(role));
    }
  }, [hydrating, role, router]);

  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="notifs" options={{ title: 'Notifs' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AppTabBar } from '@/components/AppTabBar';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';

export default function FreelancerTabsLayout() {
  const router = useRouter();
  const { role, hydrating } = useAuthStore();

  // See (producer)/_layout.tsx — same defense-in-depth pattern as the
  // existing (admin) guard: instantly route out if the active role is no
  // longer 'freelancer'.
  useEffect(() => {
    if (hydrating) return;
    if (role && role !== 'freelancer') {
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

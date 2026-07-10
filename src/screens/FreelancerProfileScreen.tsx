import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';
import { disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { DashboardView } from './DashboardView';

export function FreelancerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [tab, setTab] = useState<'profile' | 'dashboard'>('profile');

  const onLogout = async () => {
    disconnectSocket();
    await clearAuth();
    router.replace('/login');
  };

  if (!user) {
    return (
      <ScreenContainer>
        <EmptyState label="Not signed in." />
      </ScreenContainer>
    );
  }

  if (tab === 'dashboard') {
    return (
      <ScreenContainer>
        <View style={styles.toggle}>
          <SegmentedTabs
            tabs={[
              { key: 'profile', label: 'Profile' },
              { key: 'dashboard', label: 'Dashboard' },
            ]}
            activeKey={tab}
            onChange={(k) => setTab(k as 'profile' | 'dashboard')}
          />
        </View>
        <DashboardView user={user} />
      </ScreenContainer>
    );
  }

  return (
    <FreelancerProfileView
      user={user}
      footer={
        <View style={styles.footer}>
          <Button label="View Dashboard" onPress={() => setTab('dashboard')} />
          <View style={styles.gap} />
          <Button label="Log Out" variant="outline" onPress={onLogout} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginBottom: spacing.lg,
  },
  footer: {
    marginTop: spacing.sm,
  },
  gap: {
    height: spacing.md,
  },
});

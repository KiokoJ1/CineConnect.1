import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMyCredits, useMyProfile, parseSkills } from '@/api/profile';
import { useMyPortfolio } from '@/api/portfolio';
import { useFollowStatus } from '@/api/follows';
import { Button } from '@/components/Button';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { DashboardView } from './DashboardView';

export function FreelancerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { colors } = useTheme();
  const [tab, setTab] = useState<'profile' | 'dashboard'>('profile');

  // The account (name/email/role) lives in the auth store; bio, location,
  // photos, skills, experience, and film credits live in profiles/
  // film_credits (see PROFILE_EDITING.md) — merged here so the profile view
  // shows what was actually saved via Edit Profile instead of placeholders.
  const { data: profile } = useMyProfile();
  const { data: credits } = useMyCredits();
  const { data: portfolio } = useMyPortfolio();
  const { data: followStatus } = useFollowStatus(user?.id ?? '');

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

  const displayUser = {
    ...user,
    skills: parseSkills(profile?.skills),
    credits: (credits ?? []).map((c) => ({
      id: String(c.creditId),
      project: c.title,
      role: c.role,
      year: c.year ?? 0,
    })),
    dayRate: profile?.rateAmount ?? user.dayRate,
  };

  return (
    <FreelancerProfileView
      user={displayUser}
      avatarUri={profile?.avatarUrl}
      coverUri={profile?.coverUrl}
      bio={profile?.bio}
      location={profile?.location}
      experienceLevel={profile?.experienceLevel}
      portfolioItems={portfolio ?? []}
      header={
        <View>
          <Text style={[styles.followCounts, { color: colors.textSecondary }]}>
            <Text style={[styles.followCountsNumber, { color: colors.textPrimary }]}>
              {followStatus?.followerCount ?? 0}
            </Text>{' '}
            followers ·{' '}
            <Text style={[styles.followCountsNumber, { color: colors.textPrimary }]}>
              {followStatus?.followingCount ?? 0}
            </Text>{' '}
            following
          </Text>
          <RoleSwitcher />
        </View>
      }
      footer={
        <View style={styles.footer}>
          <Button label="Edit Profile" onPress={() => router.push('/edit-profile')} />
          <View style={styles.gap} />
          <Button label="Manage Portfolio" variant="outline" onPress={() => router.push('/portfolio')} />
          <View style={styles.gap} />
          <Button label="View Dashboard" variant="outline" onPress={() => setTab('dashboard')} />
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
  followCounts: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  followCountsNumber: {
    fontWeight: '700',
  },
});

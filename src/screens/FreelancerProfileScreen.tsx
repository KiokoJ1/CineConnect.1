import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { parseSkills, useMyCredits, useMyProfile, useProfileStats } from '@/api/profile';
import { useFollowStatus } from '@/api/follows';
import { useReviews } from '@/api/reviews';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FreelancerProfileView } from '@/components/FreelancerProfileView';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState } from '@/components/StateViews';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { spacing } from '@/constants/layout';
import { disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types';
import { DashboardView } from './DashboardView';

export function FreelancerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [tab, setTab] = useState<'profile' | 'dashboard'>('profile');
  const { data: profile } = useMyProfile();
  const { data: credits } = useMyCredits();
  const { data: followStatus } = useFollowStatus(user?.id ?? '');
  const { data: profileStats } = useProfileStats(user?.id ?? '');
  const { data: reviewsData } = useReviews(user?.id ?? '');

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

  // The auth-stored user is just identity (name/email/role) — bio, skills,
  // experience, location, and photos live in the separate `profiles` table
  // and are merged in here so the profile screen actually shows them,
  // instead of always rendering an empty shell.
  const displayUser: User = {
    ...user,
    bio: profile?.bio ?? undefined,
    city: profile?.location ?? user.city,
    experienceLevel: profile?.experienceLevel ?? undefined,
    skills: parseSkills(profile?.skills),
    credits: (credits ?? []).map((c) => ({
      id: String(c.creditId),
      project: c.title,
      role: c.role,
      year: c.year ?? 0,
    })),
    dayRate: profile?.rateAmount ?? user.dayRate,
    photoUri: profile?.profilePhoto,
    coverPhotoUri: profile?.coverPhoto,
    followerCount: followStatus?.followerCount,
    followingCount: followStatus?.followingCount,
    rating: profileStats?.avgRating ?? reviewsData?.avgRating,
    reviewCount: profileStats?.totalReviews ?? reviewsData?.totalReviews,
    completedJobs: profileStats?.completedJobs,
    totalApplications: profileStats?.totalApplications,
  };

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
      user={displayUser}
      reviews={reviewsData?.reviews}
      onEditPress={() => router.push('/edit-profile')}
      footer={
        <View style={styles.footer}>
          <Card style={styles.themeCard}>
            <RoleSwitcher />
          </Card>
          <Card style={styles.themeCard}>
            <ThemeToggle />
          </Card>
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
  themeCard: {
    marginBottom: spacing.lg,
  },
  gap: {
    height: spacing.md,
  },
});

import { useRouter } from 'expo-router';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMyProfile } from '@/api/profile';
import { useFollowStatus } from '@/api/follows';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StarRating } from '@/components/StarRating';
import { EmptyState } from '@/components/StateViews';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

export function ProducerProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const { data: profile } = useMyProfile();
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

  const identity = (
    <View style={styles.identity}>
      <Avatar name={user.name} color={user.avatarColor} size={88} imageUri={profile?.avatarUrl} />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.subtitle}>{user.title}</Text>
      <View style={styles.ratingRow}>
        <StarRating rating={user.rating ?? 0} reviewCount={user.reviewCount} />
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.followCounts}>
          <Text style={styles.followCountsNumber}>{followStatus?.followerCount ?? 0}</Text> followers ·{' '}
          <Text style={styles.followCountsNumber}>{followStatus?.followingCount ?? 0}</Text> following
        </Text>

        <RoleSwitcher />

        {profile?.coverUrl ? (
          <ImageBackground source={{ uri: profile.coverUrl }} style={styles.cover} imageStyle={styles.coverImage}>
            <View style={styles.coverScrim}>{identity}</View>
          </ImageBackground>
        ) : (
          identity
        )}

        {profile?.bio ? (
          <Card style={styles.detailCard}>
            <Text style={styles.detailLabel}>Bio</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </Card>
        ) : null}

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{user.jobsPosted ?? 0}</Text>
            <Text style={styles.statLabel}>Jobs Posted</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, styles.green]}>{(user.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg. Rating</Text>
          </Card>
        </View>

        <Card style={styles.detailCard}>
          <DetailRow label="📍 Location" value={profile?.location || user.city || '—'} />
          <View style={styles.divider} />
          <DetailRow label="✉️ Email" value={user.email} />
        </Card>

        <Card style={styles.detailCard}>
          <ThemeToggle />
        </Card>

        <View style={styles.actions}>
          <Button label="Edit Profile" variant="outline" onPress={() => router.push('/edit-profile')} />
          <View style={styles.gap} />
          <Button label="Post a Job" onPress={() => router.push('/post-job')} />
          <View style={styles.gap} />
          <Button label="Log Out" variant="outline" onPress={onLogout} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    scroll: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    identity: {
      alignItems: 'center',
    },
    followCounts: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    followCountsNumber: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cover: {
      marginTop: spacing.lg,
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    coverImage: {
      borderRadius: radius.card,
    },
    coverScrim: {
      backgroundColor: 'rgba(0,0,0,0.35)',
      paddingVertical: spacing.lg,
      width: '100%',
    },
    bioText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 21,
    },
    name: {
      ...typography.headingL,
      marginTop: spacing.lg,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    ratingRow: {
      marginTop: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.xxl,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    statNumber: {
      fontSize: 30,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    green: {
      color: colors.success,
    },
    statLabel: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    detailCard: {
      marginTop: spacing.xl,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    detailLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    detailValue: {
      ...typography.body,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    actions: {
      marginTop: spacing.xxl,
    },
    gap: {
      height: spacing.md,
    },
  });

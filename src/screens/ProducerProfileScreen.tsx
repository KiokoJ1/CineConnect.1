import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StarRating } from '@/components/StarRating';
import { EmptyState } from '@/components/StateViews';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
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

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <Avatar name={user.name} color={user.avatarColor} size={88} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>{user.title}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={user.rating ?? 0} reviewCount={user.reviewCount} />
          </View>
        </View>

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
          <DetailRow label="📍 City" value={user.city ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="✉️ Email" value={user.email} />
        </Card>

        <Card style={styles.detailCard}>
          <RoleSwitcher />
        </Card>

        <Card style={styles.detailCard}>
          <ThemeToggle />
        </Card>

        <View style={styles.actions}>
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

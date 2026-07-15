import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAdminStats } from '@/api/admin';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { formatNumber } from '@/utils/format';

interface QuickAction {
  key: string;
  label: string;
  emoji: string;
  color: string;
  onPress: () => void;
}

interface StatDef {
  key: string;
  label: string;
  value: number;
  color: string;
}

export default function AdminPanelScreen() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: stats, isLoading, isError, refetch, isRefetching } = useAdminStats();
  const { colors, typography } = useTheme();
  const { isTablet } = useResponsive();
  const styles = getStyles(colors, typography);

  const onLogout = async () => {
    disconnectSocket();
    await clearAuth();
    router.replace('/login');
  };

  const actions: QuickAction[] = [
    {
      key: 'users',
      label: 'Manage Users',
      emoji: '👥',
      color: colors.avatarBlue,
      onPress: () => router.push('/(admin)/users'),
    },
    {
      key: 'flagged',
      label: 'Flagged Content',
      emoji: '🚩',
      color: colors.primary,
      onPress: () => Alert.alert('Flagged Content', `${stats?.flagged ?? 0} items awaiting review.`),
    },
    {
      key: 'announce',
      label: 'Post Announcement',
      emoji: '📢',
      color: colors.success,
      onPress: () => Alert.alert('Post Announcement', 'Broadcast a message to all users.'),
    },
    {
      key: 'stats',
      label: 'System Statistics',
      emoji: '📊',
      color: colors.accent,
      onPress: () => Alert.alert('System Statistics', 'Detailed platform analytics.'),
    },
  ];

  // Loading only covers the *initial* fetch — once it settles (success or
  // error) this must fall through to a real state, never stay a spinner.
  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading admin panel…" />
      </ScreenContainer>
    );
  }

  // Query settled but failed (or, defensively, settled with no data at all)
  // — show a retry affordance instead of hanging on the spinner forever.
  if (isError || !stats) {
    return (
      <ScreenContainer>
        <ErrorState label="Couldn't load the admin panel. Check your connection and try again." />
        <Button label={isRefetching ? 'Retrying…' : 'Retry'} onPress={() => refetch()} disabled={isRefetching} />
      </ScreenContainer>
    );
  }

  const statDefs: StatDef[] = [
    { key: 'totalUsers', label: 'Total Users', value: stats.totalUsers, color: colors.textPrimary },
    { key: 'producers', label: 'Producers', value: stats.producers, color: colors.info },
    { key: 'freelancers', label: 'Freelancers', value: stats.freelancers, color: colors.success },
    { key: 'clients', label: 'Clients', value: stats.clients, color: colors.accent },
    { key: 'activeJobs', label: 'Active Jobs', value: stats.activeJobs, color: colors.warning },
    { key: 'applications', label: 'Applications', value: stats.applications, color: colors.avatarTeal },
    { key: 'messages', label: 'Messages', value: stats.messages, color: colors.accent },
    { key: 'flagged', label: 'Flagged', value: stats.flagged, color: colors.primary },
  ];

  // 4-across on a tablet/web-wide viewport, 2-across on a phone. Percentage
  // based (not a fixed pixel width) so it keeps reflowing correctly as the
  // window is resized (e.g. web) rather than locking to one device size.
  const cardBasis = isTablet ? '22%' : '47%';

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Admin Panel</Text>
        <Text style={styles.subtitle}>Platform overview</Text>

        <RoleSwitcher />

        <View style={styles.statsGrid}>
          {statDefs.map((stat) => (
            <StatCard
              key={stat.key}
              value={formatNumber(stat.value)}
              label={stat.label}
              color={stat.color}
              basis={cardBasis}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {actions.map((action) => (
          <Pressable key={action.key} onPress={action.onPress} hitSlop={4}>
            <Card style={styles.actionCard}>
              <View style={[styles.iconCircle, { backgroundColor: action.color }]}>
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))}

        <View style={styles.logout}>
          <Button label="Log Out" variant="outline" onPress={onLogout} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({
  value,
  label,
  color,
  basis,
}: {
  value: string;
  label: string;
  color: string;
  basis: `${number}%`;
}) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <Card style={{ ...styles.statCard, flexBasis: basis }}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    scroll: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxxl,
    },
    heading: {
      ...typography.headingXL,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.lg,
    },
    statCard: {
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: spacing.xl,
      minWidth: 120,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
    },
    statLabel: {
      ...typography.caption,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    sectionTitle: {
      ...typography.headingL,
      marginTop: spacing.xxl,
      marginBottom: spacing.lg,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      minHeight: 44,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    actionEmoji: {
      fontSize: 20,
    },
    actionLabel: {
      ...typography.body,
      fontWeight: '600',
      flex: 1,
    },
    chevron: {
      fontSize: 26,
      color: colors.textMuted,
    },
    logout: {
      marginTop: spacing.xxl,
    },
  });

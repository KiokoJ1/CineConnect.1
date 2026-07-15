import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMyAnalytics } from '@/api/analytics';
import { parseSkills, useMyCredits, useMyProfile } from '@/api/profile';
import { BarChart } from '@/components/BarChart';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { StarRating } from '@/components/StarRating';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';

interface DashboardViewProps {
  user: User;
}

/**
 * Each populated section is worth 20% toward completeness. Bio/skills/rate
 * come from the freelancer's `profiles` row, credits from `film_credits` —
 * both fetched separately below since they don't live on the `users` record.
 */
function profileCompleteness(params: {
  hasAvatar: boolean;
  skillCount: number;
  creditCount: number;
  bio: string | null | undefined;
  rateAmount: number | null | undefined;
}): number {
  const filled = [
    params.hasAvatar,
    params.skillCount > 0,
    params.creditCount > 0,
    !!params.bio?.trim(),
    (params.rateAmount ?? 0) > 0,
  ].filter(Boolean).length;
  return filled * 20;
}

export function DashboardView({ user }: DashboardViewProps) {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError } = useMyAnalytics();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: credits, isLoading: creditsLoading } = useMyCredits();

  const skillCount = parseSkills(profile?.skills).length;
  const completeness = profileCompleteness({
    hasAvatar: !!user.avatarColor,
    skillCount,
    creditCount: credits?.length ?? 0,
    bio: profile?.bio,
    rateAmount: profile?.rateAmount,
  });

  // The bar chart is applications-per-month for the last 6 months — the
  // backend has no profile-view tracking table, so there's no "views" metric
  // to show here (see DASHBOARD_UPDATE.md for why this differs from the
  // original mock-data design).
  const chartData = (analytics?.applicationsByMonth ?? []).map((m) => ({
    label: m.month,
    value: m.total,
  }));

  const applications = analytics?.summary.totalApplications ?? 0;
  // 'Accepted' mirrors mapBackendStatus() in src/api/applications.ts, which
  // folds the backend's 'shortlisted' and 'hired' statuses into one
  // freelancer-facing "Accepted" bucket — keep them in sync.
  const accepted = (analytics?.summary.shortlisted ?? 0) + (analytics?.summary.hired ?? 0);
  const pending = analytics?.summary.pending ?? 0;
  const rejected = analytics?.summary.declined ?? 0;
  const rating = analytics?.summary.avgRating ?? 0;
  const reviewCount = analytics?.summary.totalRatings ?? 0;

  const loading = analyticsLoading || profileLoading || creditsLoading;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>My Dashboard</Text>

      <Text style={styles.completeLabel}>Profile completeness — {completeness}%</Text>
      <ProgressBar percent={completeness} />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Applications by Month</Text>
        </View>
        {analyticsError ? (
          <Text style={styles.errorText}>Couldn't load your activity right now.</Text>
        ) : (
          <BarChart
            data={loading ? undefined : chartData}
            emptyLabel={loading ? 'Loading…' : 'No applications in the last 6 months'}
          />
        )}
      </Card>

      <View style={styles.statsRow}>
        <Card onPress={() => router.push('/my-applications')} style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statRed]}>{applications}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </Card>
        <Card onPress={() => router.push('/my-applications')} style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statAmber]}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
      </View>
      <View style={styles.statsRow}>
        <Card onPress={() => router.push('/my-applications')} style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statGreen]}>{accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </Card>
        <Card onPress={() => router.push('/my-applications')} style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statGrey]}>{rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </Card>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Rating Summary</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
          <View style={styles.ratingStars}>
            <StarRating rating={rating} showValue={false} size={20} />
          </View>
        </View>
        <Text style={styles.reviewsTotal}>{reviewCount} reviews total</Text>
      </Card>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
  },
  heading: {
    ...typography.headingXL,
    marginBottom: spacing.lg,
  },
  completeLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    marginTop: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.headingM,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  statRed: {
    color: colors.primary,
  },
  statGreen: {
    color: colors.success,
  },
  statAmber: {
    color: colors.warning,
  },
  statGrey: {
    color: colors.textSecondary,
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ratingNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ratingStars: {
    marginLeft: spacing.lg,
  },
  reviewsTotal: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});

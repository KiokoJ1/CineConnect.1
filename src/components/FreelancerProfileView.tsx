import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';
import { formatRate } from '@/utils/format';
import { AvailabilityDot } from './AvailabilityDot';
import { Avatar } from './Avatar';
import { StarRating } from './StarRating';

interface FreelancerProfileViewProps {
  user: User;
  /** Rendered at the bottom of the scroll (e.g. action button). */
  footer?: ReactNode;
  /** When provided, shows a back arrow on the header band. */
  onBack?: () => void;
}

/** Profile body with the dark purple header band — screen 6. */
export function FreelancerProfileView({ user, footer, onBack }: FreelancerProfileViewProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBand, { paddingTop: insets.top + spacing.lg }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : null}
        <View style={styles.identityRow}>
          <Avatar name={user.name} color={user.avatarColor} size={80} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.subtitle}>
              {user.title} · {user.city}
            </Text>
            <View style={styles.headerAvailability}>
              <AvailabilityDot availability={user.availability} labelColor={colors.success} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.ratingRow}>
          <StarRating rating={user.rating ?? 0} reviewCount={user.reviewCount} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skills}>
          {(user.skills ?? []).map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Credits</Text>
        {(user.credits ?? []).map((credit) => (
          <View key={credit.id} style={styles.creditRow}>
            <Text style={styles.creditProject}>{credit.project}</Text>
            <Text style={styles.creditMeta}>
              {credit.role} · {credit.year}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.dayRateLabel}>Day Rate</Text>
        <Text style={styles.dayRate}>{formatRate(user.dayRate ?? 0, ' / day')}</Text>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBand: {
      backgroundColor: colors.profileHeader,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xl,
    },
    backButton: {
      marginBottom: spacing.md,
    },
    backArrow: {
      color: colors.textOnPrimary,
      fontSize: 26,
      fontWeight: '600',
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    identityText: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    name: {
      ...typography.headingL,
      color: colors.textOnPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.border,
      marginTop: 2,
    },
    headerAvailability: {
      marginTop: spacing.sm,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    ratingRow: {
      marginTop: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    sectionTitle: {
      ...typography.headingL,
      marginBottom: spacing.md,
    },
    skills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    skillChip: {
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    skillText: {
      ...typography.label,
      color: colors.textPrimary,
    },
    creditRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    creditProject: {
      ...typography.body,
      fontWeight: '500',
      flex: 1,
      marginRight: spacing.md,
    },
    creditMeta: {
      ...typography.body,
      color: colors.textSecondary,
    },
    dayRateLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    dayRate: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.success,
      marginTop: spacing.xs,
    },
    footer: {
      marginTop: spacing.xxl,
    },
  });

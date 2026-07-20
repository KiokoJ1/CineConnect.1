import { ReactNode } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Review } from '@/api/reviews';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';
import { formatRate, formatRelativeTime } from '@/utils/format';
import { AvailabilityDot } from './AvailabilityDot';
import { Avatar } from './Avatar';
import { StarRating } from './StarRating';

interface FreelancerProfileViewProps {
  user: User;
  /** Individual reviews received — see src/api/reviews.ts#useReviews. Omit to hide the Reviews section entirely. */
  reviews?: Review[];
  /** Rendered at the bottom of the scroll (e.g. action button). */
  footer?: ReactNode;
  /** When provided, shows a back arrow on the header band. */
  onBack?: () => void;
  /** When provided, shows an edit (pencil) button on the header band — only pass this for the signed-in user's own profile. */
  onEditPress?: () => void;
}

/** Profile body with the dark purple header band — screen 6. */
export function FreelancerProfileView({ user, reviews, footer, onBack, onEditPress }: FreelancerProfileViewProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const headerContent = (
    <View style={[styles.headerBand, { paddingTop: insets.top + spacing.lg }, user.coverPhotoUri && styles.headerBandOverlay]}>
      <View style={styles.headerTopRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>←</Text>
          </Pressable>
        ) : <View />}
        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={8} style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>✎</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.identityRow}>
        <Avatar name={user.name} color={user.avatarColor} photoUri={user.photoUri} size={80} />
        <View style={styles.identityText}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>
            {[user.title, user.city].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.headerAvailability}>
            <AvailabilityDot availability={user.availability} labelColor={colors.success} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {user.coverPhotoUri ? (
        <ImageBackground source={{ uri: user.coverPhotoUri }} style={styles.coverImage}>
          {headerContent}
        </ImageBackground>
      ) : (
        headerContent
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.ratingRow}>
          <StarRating rating={user.rating ?? 0} reviewCount={user.reviewCount} />
        </View>

        {user.followerCount !== undefined ? (
          <View style={styles.followRow}>
            <Text style={styles.followStat}>
              <Text style={styles.followCount}>{user.followerCount}</Text> Followers
            </Text>
            <Text style={styles.followStat}>
              <Text style={styles.followCount}>{user.followingCount ?? 0}</Text> Following
            </Text>
          </View>
        ) : null}

        {user.completedJobs !== undefined ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{user.completedJobs}</Text>
              <Text style={styles.statLabel}>Completed Jobs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{user.totalApplications ?? 0}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
          </View>
        ) : null}

        {user.bio ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{user.bio}</Text>
          </>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skills}>
          {(user.skills ?? []).length > 0 ? (
            (user.skills ?? []).map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No skills listed yet.</Text>
          )}
        </View>

        {user.experienceLevel ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.experience}>{user.experienceLevel}</Text>
          </>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Credits</Text>
        {(user.credits ?? []).length > 0 ? (
          (user.credits ?? []).map((credit) => (
            <View key={credit.id} style={styles.creditRow}>
              <Text style={styles.creditProject}>{credit.project}</Text>
              <Text style={styles.creditMeta}>
                {credit.role} · {credit.year}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No film credits added yet.</Text>
        )}

        {reviews ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                    <Text style={styles.reviewStars}>{'★'.repeat(Math.round(review.score))}</Text>
                  </View>
                  <Text style={styles.reviewMeta}>
                    {review.projectTitle} · {formatRelativeTime(review.createdAt)}
                  </Text>
                  {review.reviewText ? <Text style={styles.reviewText}>{review.reviewText}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No reviews yet.</Text>
            )}
          </>
        ) : null}

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
    coverImage: {
      width: '100%',
    },
    headerBand: {
      backgroundColor: colors.profileHeader,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xl,
    },
    // A cover photo needs a translucent overlay behind it so white header
    // text/avatar border stay legible regardless of the photo's own colours.
    headerBandOverlay: {
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    headerButtonIcon: {
      color: colors.textOnPrimary,
      fontSize: 18,
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
    followRow: {
      flexDirection: 'row',
      gap: spacing.xl,
      marginTop: spacing.md,
    },
    followStat: {
      ...typography.caption,
    },
    followCount: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.lg,
      backgroundColor: colors.background,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    reviewCard: {
      marginBottom: spacing.lg,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewerName: {
      ...typography.body,
      fontWeight: '700',
    },
    reviewStars: {
      color: colors.star,
      letterSpacing: 1,
    },
    reviewMeta: {
      ...typography.caption,
      marginTop: 2,
    },
    reviewText: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.sm,
      lineHeight: 21,
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
    bio: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    experience: {
      ...typography.body,
      color: colors.textPrimary,
    },
    emptyText: {
      ...typography.caption,
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

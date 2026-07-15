import { ReactNode } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  /** When provided, shows an edit (pencil) button on the header band — only pass this for the signed-in user's own profile. */
  onEditPress?: () => void;
}

/** Profile body with the dark purple header band — screen 6. */
export function FreelancerProfileView({ user, footer, onBack, onEditPress }: FreelancerProfileViewProps) {
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

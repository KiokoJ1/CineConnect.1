import { ReactNode } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PortfolioItem } from '@/api/portfolio';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';
import { formatRate } from '@/utils/format';
import { AvailabilityDot } from './AvailabilityDot';
import { Avatar } from './Avatar';
import { PortfolioGrid } from './PortfolioGrid';
import { StarRating } from './StarRating';

interface FreelancerProfileViewProps {
  user: User;
  /** data: URI or http(s) URL — shows a real photo instead of the initials circle. */
  avatarUri?: string | null;
  /** data: URI or http(s) URL — shown as the header band's background. */
  coverUri?: string | null;
  bio?: string | null;
  /** Free-text location (e.g. "Nairobi, Kenya") — falls back to `user.city` when not set. */
  location?: string | null;
  experienceLevel?: string | null;
  /** Images/videos/featured work — omitted (no section rendered) if not provided. */
  portfolioItems?: PortfolioItem[];
  /** Rendered at the top of the scroll body, right below the header band (e.g. Switch Role). */
  header?: ReactNode;
  /** Rendered at the bottom of the scroll (e.g. action button). */
  footer?: ReactNode;
  /** When provided, shows a back arrow on the header band. */
  onBack?: () => void;
}

/** Profile body with the dark purple header band — screen 6. */
export function FreelancerProfileView({
  user,
  avatarUri,
  coverUri,
  bio,
  location,
  experienceLevel,
  portfolioItems,
  header,
  footer,
  onBack,
}: FreelancerProfileViewProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const headerContent = (
    <View style={[styles.headerBand, { paddingTop: insets.top + spacing.lg }, coverUri && styles.headerBandOverImage]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
      ) : null}
      <View style={styles.identityRow}>
        <Avatar name={user.name} color={user.avatarColor} size={80} imageUri={avatarUri} />
        <View style={styles.identityText}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>
            {user.title} · {location || user.city}
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
      {coverUri ? (
        <ImageBackground source={{ uri: coverUri }} style={styles.coverImage}>
          <View style={styles.coverScrim}>{headerContent}</View>
        </ImageBackground>
      ) : (
        headerContent
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {header ? <View style={styles.headerSlot}>{header}</View> : null}

        <View style={styles.ratingRow}>
          <StarRating rating={user.rating ?? 0} reviewCount={user.reviewCount} />
        </View>

        {bio ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.bioText}>{bio}</Text>
          </>
        ) : null}

        {experienceLevel ? (
          <View style={styles.experienceRow}>
            <Text style={styles.experienceLabel}>Experience</Text>
            <View style={styles.experiencePill}>
              <Text style={styles.experiencePillText}>{experienceLevel}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skills}>
          {(user.skills ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No skills added yet.</Text>
          ) : (
            (user.skills ?? []).map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Credits</Text>
        {(user.credits ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No film credits added yet.</Text>
        ) : (
          (user.credits ?? []).map((credit) => (
            <View key={credit.id} style={styles.creditRow}>
              <Text style={styles.creditProject}>{credit.project}</Text>
              <Text style={styles.creditMeta}>
                {credit.role} · {credit.year}
              </Text>
            </View>
          ))
        )}

        {portfolioItems ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <PortfolioGrid items={portfolioItems} emptyLabel="No portfolio items yet." />
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
    headerBand: {
      backgroundColor: colors.profileHeader,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xl,
    },
    headerBandOverImage: {
      backgroundColor: 'transparent',
    },
    coverImage: {
      width: '100%',
    },
    coverScrim: {
      backgroundColor: 'rgba(0,0,0,0.35)',
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
    headerSlot: {
      marginBottom: spacing.lg,
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
    bioText: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    experienceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
    },
    experienceLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    experiencePill: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    experiencePillText: {
      ...typography.label,
      color: colors.primary,
      fontWeight: '600',
    },
    emptyText: {
      ...typography.body,
      color: colors.textMuted,
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

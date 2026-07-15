import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';
import { AvailabilityDot } from './AvailabilityDot';
import { Avatar } from './Avatar';
import { Card } from './Card';

interface TalentCardProps {
  user: User;
  onPress: () => void;
}

/** Browse Talent result row. */
export function TalentCard({ user, onPress }: TalentCardProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Avatar name={user.name} color={user.avatarColor} size={64} />
        <View style={styles.body}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>
            {user.title} · {user.city}
          </Text>
          <View style={styles.statusRow}>
            <AvailabilityDot availability={user.availability} />
            <Text style={styles.rating}> · ★ {user.rating?.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    body: {
      flex: 1,
      marginLeft: spacing.lg,
    },
    name: {
      ...typography.headingM,
    },
    meta: {
      ...typography.caption,
      marginTop: 2,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    rating: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    chevron: {
      fontSize: 28,
      color: colors.textMuted,
      marginLeft: spacing.sm,
    },
  });

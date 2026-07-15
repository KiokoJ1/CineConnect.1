import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { AppNotification, NotificationType } from '@/types';

interface NotificationRowProps {
  notification: AppNotification;
  onPress: () => void;
}

const getIcons = (colors: ThemeColors): Record<NotificationType, { emoji: string; tint: string }> => ({
  message_request: { emoji: '✉️', tint: colors.primarySoft },
  application_shortlisted: { emoji: '📋', tint: colors.successSoft },
  review_received: { emoji: '⭐', tint: colors.starSoft },
  application_sent: { emoji: '💼', tint: colors.border },
  profile_viewed: { emoji: '👤', tint: colors.border },
  new_application: { emoji: '📥', tint: colors.infoSoft },
  application_accepted: { emoji: '✅', tint: colors.successSoft },
  application_declined: { emoji: '📪', tint: colors.border },
});

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const icon = getIcons(colors)[notification.type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: icon.tint },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.emoji}>{icon.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.subtitle}>{notification.subtitle}</Text>
      </View>
      <Text style={styles.time}>{notification.timestamp}</Text>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.card,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    pressed: {
      opacity: 0.85,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: radius.circle,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 22,
    },
    body: {
      flex: 1,
      marginLeft: spacing.md,
    },
    title: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      ...typography.caption,
      marginTop: 2,
    },
    time: {
      ...typography.caption,
      color: colors.textMuted,
      marginLeft: spacing.sm,
    },
  });

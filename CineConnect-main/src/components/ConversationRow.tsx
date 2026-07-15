import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Conversation } from '@/types';
import { Avatar } from './Avatar';

interface ConversationRowProps {
  conversation: Conversation;
  onPress: () => void;
}

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const { unread } = conversation;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, unread && styles.unreadRow, pressed && styles.pressed]}
    >
      <Avatar name={conversation.participantName} color={conversation.avatarColor} size={56} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.participantName}
          </Text>
          <Text style={styles.time}>{conversation.timestamp}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, unread && styles.previewUnread]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {unread ? <View style={styles.dot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unreadRow: {
      backgroundColor: colors.primarySoft,
    },
    pressed: {
      opacity: 0.85,
    },
    body: {
      flex: 1,
      marginLeft: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    name: {
      ...typography.headingM,
      flex: 1,
      marginRight: spacing.sm,
    },
    time: {
      ...typography.caption,
      color: colors.textMuted,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    preview: {
      ...typography.body,
      color: colors.textSecondary,
      flex: 1,
      marginRight: spacing.sm,
    },
    previewUnread: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
    },
  });

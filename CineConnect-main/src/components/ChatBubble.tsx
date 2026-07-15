import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { formatMessageTime } from '@/utils/format';

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'seen';

interface ChatBubbleProps {
  text: string;
  mine: boolean;
  createdAt: string;
  /** Only rendered for the sender's most recent outgoing message, mirroring Instagram's single trailing status line. */
  status?: MessageDeliveryStatus;
}

const STATUS_LABEL: Record<MessageDeliveryStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  seen: 'Seen',
};

export function ChatBubble({ text, mine, createdAt, status }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>{text}</Text>
        </View>
      </View>
      <View style={[styles.metaRow, mine ? styles.metaRowMine : styles.metaRowTheirs]}>
        <Text style={styles.time}>{formatMessageTime(createdAt)}</Text>
        {mine && status ? (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[styles.time, status === 'seen' && styles.seen]}>{STATUS_LABEL[status]}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
    },
    wrapMine: {
      alignItems: 'flex-end',
    },
    wrapTheirs: {
      alignItems: 'flex-start',
    },
    row: {
      flexDirection: 'row',
    },
    rowMine: {
      justifyContent: 'flex-end',
    },
    rowTheirs: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '78%',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.card,
    },
    mine: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    theirs: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    text: {
      fontSize: 15,
      lineHeight: 21,
    },
    textMine: {
      color: colors.textOnPrimary,
    },
    textTheirs: {
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      paddingHorizontal: 4,
    },
    metaRowMine: {
      justifyContent: 'flex-end',
    },
    metaRowTheirs: {
      justifyContent: 'flex-start',
    },
    metaDot: {
      fontSize: 11,
      color: colors.textMuted,
      marginHorizontal: 4,
    },
    time: {
      fontSize: 11,
      color: colors.textMuted,
    },
    seen: {
      color: colors.info,
      fontWeight: '600',
    },
  });

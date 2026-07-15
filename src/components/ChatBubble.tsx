import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface ChatBubbleProps {
  text: string;
  mine: boolean;
  /** Shown as a small caption under the bubble — pass only for the last bubble in a consecutive group. */
  time?: string;
  /** Tightens vertical spacing for bubbles grouped with the one above (same sender, close in time). */
  grouped?: boolean;
}

export function ChatBubble({ text, mine, time, grouped }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, grouped && styles.rowGrouped]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>{text}</Text>
      </View>
      {time ? <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{time}</Text> : null}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      marginBottom: spacing.md,
    },
    rowGrouped: {
      marginBottom: 2,
    },
    rowMine: {
      alignItems: 'flex-end',
    },
    rowTheirs: {
      alignItems: 'flex-start',
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
    time: {
      fontSize: 11,
      marginTop: 4,
      color: colors.textMuted,
    },
    timeMine: {
      marginRight: 4,
    },
    timeTheirs: {
      marginLeft: 4,
    },
  });

import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface ChatBubbleProps {
  text: string;
  mine: boolean;
}

export function ChatBubble({ text, mine }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>{text}</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginBottom: spacing.md,
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
  });

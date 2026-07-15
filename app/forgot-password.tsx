import { StyleSheet, Text, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

/**
 * Placeholder reset-password screen. Wired into routing so the login link has a
 * real destination; the reset flow itself is a later phase.
 */
export default function ForgotPasswordScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <ScreenContainer>
      <BackHeader label="Back" />
      <View style={styles.body}>
        <Text style={styles.heading}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          Password recovery is coming soon. For now, contact support to reset your account.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    body: {
      flex: 1,
      justifyContent: 'center',
    },
    heading: {
      ...typography.headingL,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
      lineHeight: 22,
      paddingHorizontal: spacing.lg,
    },
  });

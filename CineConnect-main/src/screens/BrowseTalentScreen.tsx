import { StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { TalentBrowser } from '@/components/TalentBrowser';
import { spacing } from '@/constants/layout';

import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
export function BrowseTalentScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <ScreenContainer>
      <Text style={styles.heading}>Browse Talent</Text>
      <TalentBrowser />
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
  heading: {
    ...typography.headingXL,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});

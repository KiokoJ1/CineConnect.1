import { TextStyle } from 'react-native';

import { ThemeColors, lightColors } from './colors';

/**
 * Typography scale from the design system. Colour depends on the active
 * theme, so this is a function of `colors` rather than a static object —
 * call it via `useTheme().typography` inside components:
 *   const { typography } = useTheme();
 *   ...StyleSheet.create({ text: { ...typography.headingL } })
 */
export function getTypography(colors: ThemeColors) {
  return {
    headingXL: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    } as TextStyle,
    headingL: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    } as TextStyle,
    headingM: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    } as TextStyle,
    body: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.textPrimary,
    } as TextStyle,
    caption: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
    } as TextStyle,
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    } as TextStyle,
  } as const;
}

export type Typography = ReturnType<typeof getTypography>;

/**
 * @deprecated Use `useTheme().typography` instead so colours update with the
 * active theme. Kept only so any not-yet-migrated file still compiles.
 */
export const typography = getTypography(lightColors);

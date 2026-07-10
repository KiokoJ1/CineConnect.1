import { useColorScheme } from 'react-native';

import { ThemeColors, darkColors, lightColors } from '@/constants/colors';
import { Typography, getTypography } from '@/constants/typography';
import { ThemePreference, useThemeStore } from '@/store/themeStore';

export interface Theme {
  /** The resolved scheme actually being shown ('system' is never returned here). */
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  typography: Typography;
  /** What the user picked — may be 'system'. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Convenience: flips light&lt;-&gt;dark, resolving 'system' to its current value first. */
  toggle: () => void;
}

/**
 * Single source of truth for colours/typography anywhere in the app.
 * Usage: `const { colors, typography, isDark, toggle } = useTheme();`
 */
export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreferenceRaw = useThemeStore((s) => s.setPreference);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const colors = scheme === 'dark' ? darkColors : lightColors;

  return {
    scheme,
    isDark: scheme === 'dark',
    colors,
    typography: getTypography(colors),
    preference,
    setPreference: (next) => {
      setPreferenceRaw(next);
    },
    toggle: () => {
      setPreferenceRaw(scheme === 'dark' ? 'light' : 'dark');
    },
  };
}

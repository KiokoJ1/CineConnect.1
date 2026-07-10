import { colors } from './colors';

export const theme = {
  light: {
    background: colors.background,
    surface: colors.surface,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
    navActive: colors.navActive,
    navInactive: colors.navInactive,
    statusBar: 'dark',
    icon: colors.textPrimary,
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: '#2F3033',
    navActive: '#F97316',
    navInactive: '#9CA3AF',
    statusBar: 'light',
    icon: '#F9FAFB',
    cardShadow: 'rgba(0, 0, 0, 0.32)',
  },
} as const;

export type ThemeColors = typeof theme.light;

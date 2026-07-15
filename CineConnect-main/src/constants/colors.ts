/**
 * CineConnectKE design tokens — the single source of truth for colour.
 * No hex values may appear anywhere else in the codebase.
 *
 * Two palettes, identical keys, so every screen/component that consumes
 * `useTheme().colors` works unchanged regardless of which is active.
 */
export const lightColors = {
  // Backgrounds
  background: '#F2F4F7', // primary light grey background
  splash: '#1A1B2E', // dark navy, splash only
  profileHeader: '#2D1B4E', // dark purple band behind freelancer avatar
  surface: '#FFFFFF', // cards / inputs

  // Brand
  primary: '#E03131', // primary red
  primarySoft: '#FDECEC', // red tint background (badges, notif rows)

  // Text
  textPrimary: '#1A1B2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#16A34A', // available / accepted green
  successSoft: '#E8F6EE',
  info: '#2563EB', // production-type outline tag (blue/teal)
  infoSoft: '#E8F0FE',
  warning: '#EA580C', // admin "active jobs" orange
  accent: '#7C3AED', // admin "messages" purple
  star: '#F59E0B', // rating stars (amber)
  starSoft: '#FEF6E0',

  // Lines & nav
  border: '#E5E7EB',
  navActive: '#E03131',
  navInactive: '#9CA3AF',

  // Avatar palette (deterministic per name)
  avatarRed: '#E03131',
  avatarBlue: '#2563EB',
  avatarGreen: '#16A34A',
  avatarPurple: '#7C3AED',
  avatarOrange: '#D97706',
  avatarTeal: '#0D9488',
  avatarMuted: '#9CA3AF', // suspended / disabled avatar

  // Misc
  shadow: '#1A1B2E',
  overlay: 'rgba(26, 27, 46, 0.45)',
  transparent: 'transparent',
} as const;

export const darkColors: Record<keyof typeof lightColors, string> = {
  // Backgrounds
  background: '#0F1117',
  splash: '#1A1B2E',
  profileHeader: '#2D1B4E',
  surface: '#1B1E29',

  // Brand
  primary: '#FF5C5C',
  primarySoft: '#3A1F22',

  // Text
  textPrimary: '#F2F3F7',
  textSecondary: '#A2A6BA',
  textMuted: '#71758A',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#34D07F',
  successSoft: '#173323',
  info: '#6EA8FE',
  infoSoft: '#132A4D',
  warning: '#FB923C',
  accent: '#A78BFA',
  star: '#FBBF24',
  starSoft: '#3A2E0E',

  // Lines & nav
  border: '#2A2E3A',
  navActive: '#FF5C5C',
  navInactive: '#71758A',

  // Avatar palette — kept vivid; they sit on solid colour with white text
  // regardless of theme, so no dark-specific adjustment needed.
  avatarRed: '#E03131',
  avatarBlue: '#2563EB',
  avatarGreen: '#16A34A',
  avatarPurple: '#7C3AED',
  avatarOrange: '#D97706',
  avatarTeal: '#0D9488',
  avatarMuted: '#71758A',

  // Misc
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  transparent: 'transparent',
};

export type ColorToken = keyof typeof lightColors;
export type ThemeColors = Record<ColorToken, string>;

/**
 * @deprecated Use `useTheme().colors` instead so the value updates when the
 * user switches theme. Kept only so any not-yet-migrated file still compiles
 * (it will simply stay on the light palette).
 */
export const colors = lightColors;


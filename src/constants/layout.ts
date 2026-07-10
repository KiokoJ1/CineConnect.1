/** Spacing, radius and sizing tokens. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  input: 8,
  card: 12,
  pill: 24,
  circle: 9999,
} as const;

export const layout = {
  screenPadding: 16, // standard horizontal screen padding
  cardPadding: 16,
  inputHeight: 52,
  buttonHeight: 54,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

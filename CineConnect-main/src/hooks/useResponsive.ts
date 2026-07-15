import { useWindowDimensions } from 'react-native';

/** Design was built against a 375pt-wide phone (iPhone-ish baseline). */
const BASE_WIDTH = 375;

export interface Responsive {
  width: number;
  height: number;
  isSmallDevice: boolean; // e.g. iPhone SE
  isTablet: boolean;
  /** Scales a size toward the device width, damped by `factor` so text doesn't balloon on tablets. */
  scale: (size: number, factor?: number) => number;
}

/**
 * `const { isTablet, scale } = useResponsive();`
 * Use `scale(16)` in place of a hardcoded font size/spacing value wherever a
 * component needs to adapt across phone sizes and tablets, rather than
 * assuming a fixed 375-wide screen.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  const scale = (size: number, factor = 0.25) => {
    const ratio = width / BASE_WIDTH;
    return Math.round(size + (size * ratio - size) * factor);
  };

  return {
    width,
    height,
    isSmallDevice: width < 360,
    isTablet: width >= 768,
    scale,
  };
}

/** Minimum touch target per WCAG / Apple HIG — use for any custom Pressable. */
export const MIN_TOUCH_TARGET = 44;

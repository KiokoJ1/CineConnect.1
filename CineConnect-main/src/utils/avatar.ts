import { colors } from '@/constants/colors';

const PALETTE = [
  colors.avatarRed,
  colors.avatarBlue,
  colors.avatarGreen,
  colors.avatarPurple,
  colors.avatarOrange,
  colors.avatarTeal,
];

/** First letters of the first two words, e.g. "Brian Kamau" -> "BK". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic colour from a name so a given user always looks the same. */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

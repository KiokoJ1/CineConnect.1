import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PortfolioItem } from '@/api/portfolio';
import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

interface PortfolioGridProps {
  items: PortfolioItem[];
  /** Shows a star/remove control on each thumbnail (used on the manage screen; the read-only profile view omits this). */
  editable?: boolean;
  onToggleFeatured?: (item: PortfolioItem) => void;
  onDelete?: (item: PortfolioItem) => void;
  emptyLabel?: string;
}

function openItem(item: PortfolioItem) {
  if (item.mediaType === 'video') {
    Linking.openURL(item.mediaUrl).catch(() => {});
  }
  // Images just show larger inline via the thumbnail itself — no separate
  // lightbox in this pass (see PORTFOLIO.md's known gaps).
}

function Thumbnail({
  item,
  size,
  editable,
  onToggleFeatured,
  onDelete,
}: {
  item: PortfolioItem;
  size: number;
  editable?: boolean;
  onToggleFeatured?: (item: PortfolioItem) => void;
  onDelete?: (item: PortfolioItem) => void;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const previewUri = item.thumbnailUrl || item.mediaUrl;
  const isPlayable = item.mediaType === 'video';

  return (
    <Pressable onPress={() => openItem(item)} style={[styles.tile, { width: size, height: size }]}>
      {isPlayable && !item.thumbnailUrl ? (
        <View style={[styles.videoFallback, { width: size, height: size }]}>
          <Text style={styles.videoFallbackIcon}>🎬</Text>
        </View>
      ) : (
        <Image source={{ uri: previewUri }} style={[styles.image, { width: size, height: size }]} />
      )}

      {isPlayable ? (
        <View style={styles.playBadge}>
          <Text style={styles.playBadgeText}>▶</Text>
        </View>
      ) : null}

      {item.isFeatured ? (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>★</Text>
        </View>
      ) : null}

      {editable ? (
        <View style={styles.editRow}>
          <Pressable
            hitSlop={6}
            onPress={() => onToggleFeatured?.(item)}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>{item.isFeatured ? '★' : '☆'}</Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={() => onDelete?.(item)} style={styles.editButton}>
            <Text style={styles.editButtonText}>×</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Thumbnail grid, with a horizontal "Featured Work" rail up top when any item is starred. */
export function PortfolioGrid({ items, editable, onToggleFeatured, onDelete, emptyLabel }: PortfolioGridProps) {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const styles = getStyles(colors);
  const featured = items.filter((i) => i.isFeatured);
  const columns = isTablet ? 5 : 3;
  const gridSize = `${100 / columns - 3}%`;

  if (items.length === 0) {
    return <Text style={styles.emptyText}>{emptyLabel ?? 'No portfolio items yet.'}</Text>;
  }

  return (
    <View>
      {featured.length > 0 ? (
        <>
          <Text style={styles.railLabel}>Featured Work</Text>
          <View style={styles.rail}>
            {featured.map((item) => (
              <View key={item.portfolioItemId} style={styles.railItem}>
                <Thumbnail
                  item={item}
                  size={120}
                  editable={editable}
                  onToggleFeatured={onToggleFeatured}
                  onDelete={onDelete}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.railLabel}>All Work</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.portfolioItemId} style={[styles.gridItem, { width: gridSize as any }]}>
            <Thumbnail
              item={item}
              size={100}
              editable={editable}
              onToggleFeatured={onToggleFeatured}
              onDelete={onDelete}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
    },
    railLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    rail: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    railItem: {},
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    gridItem: {
      aspectRatio: 1,
    },
    tile: {
      borderRadius: radius.card,
      overflow: 'hidden',
      backgroundColor: colors.avatarMuted,
    },
    image: {
      resizeMode: 'cover',
    },
    videoFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.profileHeader,
    },
    videoFallbackIcon: {
      fontSize: 28,
    },
    playBadge: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -14,
      marginLeft: -14,
      width: 28,
      height: 28,
      borderRadius: radius.circle,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
    },
    featuredBadge: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      backgroundColor: colors.star,
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    featuredBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    editRow: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    editButton: {
      width: 24,
      height: 24,
      borderRadius: radius.circle,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });

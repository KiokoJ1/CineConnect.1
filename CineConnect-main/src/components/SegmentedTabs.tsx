import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from './Badge';

export interface SegmentTab {
  key: string;
  label: string;
  badge?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

/** Underlined text tab switcher (Chats|Requests, My Jobs|Browse Talent). */
export function SegmentedTabs({ tabs, activeKey, onChange }: SegmentedTabsProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)} hitSlop={4}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {tab.label}
              </Text>
              {tab.badge ? (
                <View style={styles.badge}>
                  <Badge count={tab.badge} />
                </View>
              ) : null}
            </View>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      minHeight: 44,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    label: {
      fontSize: 17,
      fontWeight: '700',
    },
    labelActive: {
      color: colors.primary,
    },
    labelInactive: {
      color: colors.textSecondary,
    },
    badge: {
      marginLeft: spacing.sm,
    },
    underline: {
      height: 2,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
    },
    underlineActive: {
      height: 2.5,
      backgroundColor: colors.primary,
    },
  });

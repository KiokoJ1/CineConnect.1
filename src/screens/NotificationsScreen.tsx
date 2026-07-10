import { useRouter } from 'expo-router';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';

import { useMarkAllRead, useNotifications } from '@/api/notifications';
import { NotificationRow } from '@/components/NotificationRow';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';
import { AppNotification } from '@/types';

import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
export function NotificationsScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const router = useRouter();
  const { data, isLoading, isError } = useNotifications();
  const markAll = useMarkAllRead();

  const sections = buildSections(data ?? []);

  const onPressNotification = (n: AppNotification) => {
    if (n.target) router.push(n.target as never);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        <Pressable hitSlop={8} onPress={() => markAll.mutate()}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => onPressNotification(item)} />
          )}
          ListEmptyComponent={<EmptyState emoji="🔔" label="You're all caught up." />}
        />
      )}
    </ScreenContainer>
  );
}

function buildSections(items: AppNotification[]) {
  const today = items.filter((n) => n.group === 'today');
  const earlier = items.filter((n) => n.group === 'earlier');
  const sections: { title: string; data: AppNotification[] }[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.headingXL,
  },
  markAll: {
    ...typography.label,
    color: colors.primary,
    fontSize: 15,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
});

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useMyJobs } from '@/api/jobs';
import { useUnreadCount } from '@/api/notifications';
import { BellButton } from '@/components/BellButton';
import { Button } from '@/components/Button';
import { ProducerJobCard } from '@/components/ProducerJobCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { TalentBrowser } from '@/components/TalentBrowser';
import { spacing } from '@/constants/layout';
import { useAuthStore } from '@/store/authStore';

import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
export function ProducerHomeScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadCount();
  const [tab, setTab] = useState<'jobs' | 'talent'>('jobs');
  const { data, isLoading, isError } = useMyJobs();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.company} numberOfLines={1}>
            {user?.name ?? 'Producer'}
          </Text>
        </View>
        <BellButton count={unread} onPress={() => router.push('/(producer)/notifs')} />
      </View>

      <Button label="+ Post a Job" onPress={() => router.push('/post-job')} />

      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={[
            { key: 'jobs', label: 'My Jobs' },
            { key: 'talent', label: 'Browse Talent' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as 'jobs' | 'talent')}
        />
      </View>

      {tab === 'jobs' ? (
        isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(j) => j.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ProducerJobCard
                job={item}
                onPress={() => router.push(`/applications/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <EmptyState emoji="🎬" label="You haven't posted any jobs yet." />
            }
          />
        )
      ) : (
        <TalentBrowser />
      )}
    </ScreenContainer>
  );
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
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  welcome: {
    ...typography.body,
    color: colors.textSecondary,
  },
  company: {
    ...typography.headingXL,
    fontSize: 26,
    marginTop: 2,
  },
  tabs: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

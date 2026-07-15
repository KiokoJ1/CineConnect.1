import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useApplyToJob, useJobsFeed } from '@/api/jobs';
import { useAppliedJobIds } from '@/api/applications';
import { useUnreadCount } from '@/api/notifications';
import { AxiosError } from 'axios';
import { BellButton } from '@/components/BellButton';
import { JobCard } from '@/components/JobCard';
import { Pill } from '@/components/Pill';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { JOB_CATEGORIES } from '@/constants/categories';
import { spacing } from '@/constants/layout';
import { useAuthStore } from '@/store/authStore';
import { Job } from '@/types';
import { getFirstName, getGreeting } from '@/utils/format';

import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
export function FreelancerHomeScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadCount();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const apply = useApplyToJob();
  const appliedJobIds = useAppliedJobIds();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJobsFeed(category);

  const allJobs = (data?.pages ?? []).flatMap((p) => p.jobs);
  const jobs = filterBySearch(allJobs, search);

  const onApply = (job: Job) => {
    apply.mutate(job.id, {
      onSuccess: () => Alert.alert('Application sent', `You applied to "${job.title}".`),
      onError: (error) => {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 409) {
          // Cache already thinks otherwise (e.g. stale data) — reconcile silently.
          Alert.alert('Already applied', "You've already applied to this job.");
          return;
        }
        Alert.alert('Could not apply', err.response?.data?.message ?? 'Please try again.');
      },
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{getFirstName(user?.name ?? 'there')} 👋</Text>
        </View>
        <BellButton count={unread} onPress={() => router.push('/(freelancer)/notifs')} />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search jobs, roles..." value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.pillsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={JOB_CATEGORIES as unknown as string[]}
          keyExtractor={(c) => c}
          renderItem={({ item }) => (
            <Pill label={item} active={item === category} onPress={() => setCategory(item)} />
          )}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState label="Could not load jobs." />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && !search) fetchNextPage();
          }}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push(`/job/${item.id}`)}
              onApply={() => onApply(item)}
              applying={apply.isPending && apply.variables === item.id}
              applied={appliedJobIds.has(item.id)}
            />
          )}
          ListEmptyComponent={<EmptyState emoji="🎬" label="No jobs found in this category." />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={styles.footer} />
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

function filterBySearch(jobs: Job[], search: string): Job[] {
  if (!search.trim()) return jobs;
  const q = search.toLowerCase();
  return jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(q) ||
      j.category.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q),
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
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  name: {
    ...typography.headingXL,
    marginTop: 2,
  },
  searchWrap: {
    marginBottom: spacing.lg,
  },
  pillsWrap: {
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  footer: {
    marginVertical: spacing.lg,
  },
});

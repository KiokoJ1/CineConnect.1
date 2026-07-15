import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { useApplicationActions, useApplications } from '@/api/applications';
import { useJob } from '@/api/jobs';
import { ApplicantCard } from '@/components/ApplicantCard';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Application, ApplicationStatus } from '@/types';
import { extractErrorMessage } from '@/utils/errors';

// Internal status values ('shortlisted'/'declined') are unchanged from the
// existing architecture — only the UI-facing wording is "Accept"/"Reject"
// per this task's requirements.
type Filter = 'all' | 'shortlisted' | 'declined';

export default function ApplicationsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job } = useJob(jobId);
  const { data, isLoading, isError, refetch, isRefetching } = useApplications(jobId);
  const { shortlist, decline } = useApplicationActions(jobId);
  const [filter, setFilter] = useState<Filter>('all');
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  const apps = data ?? [];
  const counts = useMemo(
    () => ({
      all: apps.length,
      shortlisted: apps.filter((a: Application) => a.status === 'shortlisted').length,
      declined: apps.filter((a: Application) => a.status === 'declined').length,
    }),
    [apps],
  );

  const visible = apps.filter((a: Application) =>
    filter === 'all' ? true : a.status === (filter as ApplicationStatus),
  );

  return (
    <ScreenContainer>
      <BackHeader label={job?.title ?? 'Applications'} emphasis="bold" />
      <Text style={styles.subtitle}>{counts.all} applications received</Text>

      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'shortlisted', label: `Accepted (${counts.shortlisted})` },
            { key: 'declined', label: `Rejected (${counts.declined})` },
          ]}
          activeKey={filter}
          onChange={(k) => setFilter(k as Filter)}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <ErrorState label="Couldn't load applications. Check your connection and try again." />
          <Button label={isRefetching ? 'Retrying…' : 'Retry'} onPress={() => refetch()} disabled={isRefetching} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const runOrConfirm = (
              force: boolean | undefined,
              label: 'Accept' | 'Reject',
              mutation: typeof shortlist,
            ) => {
              const run = () => mutation.mutate({ id: item.id, force }, {
                onError: (err) => {
                  Alert.alert(
                    'Could not update status',
                    extractErrorMessage(err) ?? 'Please try again.',
                  );
                },
              });

              if (force) {
                Alert.alert(
                  'Change decision?',
                  `${item.applicant.name}'s application is already ${item.status === 'shortlisted' ? 'Accepted' : 'Rejected'}. ${label} it instead?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: label, style: label === 'Reject' ? 'destructive' : 'default', onPress: run },
                  ],
                );
              } else {
                run();
              }
            };

            return (
              <ApplicantCard
                application={item}
                onPress={() => router.push(`/talent/${item.applicant.id}`)}
                onShortlist={(force) => runOrConfirm(force, 'Accept', shortlist)}
                onDecline={(force) => runOrConfirm(force, 'Reject', decline)}
                shortlisting={shortlist.isPending && shortlist.variables?.id === item.id}
                declining={decline.isPending && decline.variables?.id === item.id}
              />
            );
          }}
          ListEmptyComponent={<EmptyState emoji="📋" label="No applications in this filter." />}
        />
      )}
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    subtitle: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    tabs: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    errorWrap: {
      flex: 1,
    },
    list: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
  });

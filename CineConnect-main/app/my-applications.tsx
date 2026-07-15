import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { MyApplication, useMyApplications } from '@/api/applications';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { Tag } from '@/components/Tag';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { ApplicationStatus } from '@/types';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  shortlisted: 'Accepted',
  declined: 'Rejected',
};

export default function MyApplicationsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useMyApplications();
  const { colors, typography } = useTheme();
  const { isTablet } = useResponsive();
  const styles = getStyles(colors, typography);

  const numColumns = isTablet ? 2 : 1;

  return (
    <ScreenContainer>
      <BackHeader label="My Applications" emphasis="bold" />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <ErrorState label="Couldn't load your applications. Check your connection and try again." />
          <Button label={isRefetching ? 'Retrying…' : 'Retry'} onPress={() => refetch()} disabled={isRefetching} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={data ?? []}
          keyExtractor={(a) => a.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <ApplicationRow application={item} wide={numColumns > 1} onPress={() => router.push(`/job/${item.jobId}`)} />
          )}
          ListEmptyComponent={
            <EmptyState emoji="📄" label="You haven't applied to any jobs yet." />
          }
        />
      )}
    </ScreenContainer>
  );
}

function ApplicationRow({
  application,
  wide,
  onPress,
}: {
  application: MyApplication;
  wide: boolean;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const variant = application.status === 'shortlisted' ? 'green' : application.status === 'declined' ? 'grey' : 'red-outline';

  return (
    <Card onPress={onPress} style={[styles.row, wide && styles.rowWide]}>
      <View style={styles.rowHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {application.jobTitle}
        </Text>
        <Tag label={STATUS_LABEL[application.status]} variant={variant} />
      </View>
      {application.coverLetter ? (
        <Text style={styles.coverLetter} numberOfLines={2}>
          “{application.coverLetter}”
        </Text>
      ) : null}
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    list: {
      paddingBottom: spacing.xxl,
    },
    columnWrapper: {
      gap: spacing.lg,
    },
    errorWrap: {
      flex: 1,
    },
    row: {
      marginBottom: spacing.lg,
    },
    rowWide: {
      flex: 1,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    jobTitle: {
      ...typography.headingM,
      flex: 1,
    },
    coverLetter: {
      ...typography.caption,
      marginTop: spacing.sm,
      lineHeight: 19,
    },
  });

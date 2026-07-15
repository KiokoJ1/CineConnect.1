import { useLocalSearchParams, useRouter } from 'expo-router';
import { AxiosError } from 'axios';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApplyToJob, useJob } from '@/api/jobs';
import { useAppliedJobIds } from '@/api/applications';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { EmptyState, LoadingState } from '@/components/StateViews';
import { Tag } from '@/components/Tag';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { formatRate } from '@/utils/format';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: job, isLoading } = useJob(id);
  const apply = useApplyToJob();
  const appliedJobIds = useAppliedJobIds();
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  if (isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer>
        <BackHeader label="Back to jobs" />
        <EmptyState emoji="🎬" label="This job is no longer available." />
      </ScreenContainer>
    );
  }

  const applied = appliedJobIds.has(job.id);

  const onApply = () => {
    apply.mutate(job.id, {
      onSuccess: () =>
        Alert.alert('Application sent!', `You applied to "${job.title}".`, [
          { text: 'OK', onPress: () => router.back() },
        ]),
      onError: (error) => {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 409) {
          Alert.alert('Already applied', "You've already applied to this job.");
          return;
        }
        Alert.alert('Could not apply', err.response?.data?.message ?? 'Please try again.');
      },
    });
  };

  return (
    <ScreenContainer>
      <BackHeader label="Back to jobs" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{job.title}</Text>

        <View style={styles.tags}>
          <Tag label={job.department} variant="red" />
        </View>

        <Card style={styles.infoCard}>
          <InfoRow icon="📍" label="Location" value={job.location} />
          <Divider />
          <InfoRow icon="📅" label="Dates" value={`${job.startDate}–${job.endDate}`} />
          <Divider />
          <InfoRow icon="💰" label="Rate" value={formatRate(job.dayRate)} valueColor={colors.success} />
        </Card>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{job.description}</Text>

        <Text style={styles.sectionTitle}>About Producer</Text>
        <View style={styles.producerRow}>
          <Avatar name={job.producer.name} color={job.producer.avatarColor} size={56} />
          <View style={styles.producerText}>
            <Text style={styles.producerName}>{job.producer.name}</Text>
            <Text style={styles.producerMeta}>
              {job.producer.jobsPosted} jobs posted · {job.producer.rating.toFixed(1)} ★
            </Text>
          </View>
          <Button
            label="Message"
            variant="outline"
            compact
            onPress={() => router.push(`/chat/${job.producer.id}`)}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={applied ? 'Applied' : 'Apply Now'}
          onPress={onApply}
          variant={applied ? 'success' : 'primary'}
          loading={apply.isPending}
          disabled={applied}
        />
      </View>
    </ScreenContainer>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {icon} {label}
      </Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    scroll: {
      paddingBottom: spacing.xxxl,
    },
    title: {
      ...typography.headingXL,
      marginTop: spacing.sm,
    },
    tags: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    infoCard: {
      marginTop: spacing.xl,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      flexWrap: 'wrap',
    },
    infoLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    infoValue: {
      ...typography.body,
      fontWeight: '700',
    },
    sectionTitle: {
      ...typography.headingL,
      marginTop: spacing.xxl,
      marginBottom: spacing.md,
    },
    description: {
      ...typography.body,
      lineHeight: 23,
      color: colors.textPrimary,
    },
    producerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      rowGap: spacing.md,
    },
    producerText: {
      marginLeft: spacing.md,
      flexShrink: 1,
    },
    producerName: {
      ...typography.headingM,
    },
    producerMeta: {
      ...typography.caption,
      marginTop: 2,
    },
    footer: {
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
  });

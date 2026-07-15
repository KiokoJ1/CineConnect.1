import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Job } from '@/types';
import { Card } from './Card';
import { Tag } from './Tag';

interface ProducerJobCardProps {
  job: Job;
  onPress: () => void;
}

/** My Jobs card on the producer home screen. */
export function ProducerJobCard({ job, onPress }: ProducerJobCardProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const closed = job.status === 'closed';
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, closed && styles.muted]} numberOfLines={1}>
          {job.title}
        </Text>
        <Tag label={closed ? 'Closed' : 'Open'} variant={closed ? 'grey' : 'red-outline'} />
      </View>

      <Text style={styles.meta}>
        {job.productionType} · {job.startDate}
      </Text>

      <Text style={styles.applications}>👥 {job.applicationCount} applications</Text>

      {closed ? (
        <Text style={styles.filled}>Position filled</Text>
      ) : (
        <Text style={styles.shortlisted}>{job.shortlistedCount} shortlisted</Text>
      )}
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.headingM,
      fontSize: 20,
      flex: 1,
      marginRight: spacing.md,
    },
    muted: {
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      marginTop: spacing.sm,
    },
    applications: {
      ...typography.body,
      marginTop: spacing.md,
    },
    shortlisted: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
      marginTop: spacing.xs,
    },
    filled: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
  });

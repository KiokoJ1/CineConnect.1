import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Job } from '@/types';
import { formatRate } from '@/utils/format';
import { Button } from './Button';
import { Card } from './Card';
import { Tag } from './Tag';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onApply: () => void;
  applying?: boolean;
  /** True once the signed-in freelancer already has an application on record for this job. */
  applied?: boolean;
}

/** Job feed card on the freelancer home screen. */
export function JobCard({ job, onPress, onApply, applying, applied }: JobCardProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>
        <Tag label={job.category} variant="red-outline" />
      </View>

      <Text style={styles.meta}>
        {job.location.replace(', Kenya', '')} · {job.startDate}–{job.endDate}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.rate}>{formatRate(job.dayRate)}</Text>
        <Button
          label={applied ? 'Applied' : 'Apply'}
          onPress={onApply}
          variant={applied ? 'success' : 'primary'}
          compact
          loading={applying}
          disabled={applied}
        />
      </View>
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.headingM,
      fontSize: 20,
      flex: 1,
      marginRight: spacing.md,
    },
    meta: {
      ...typography.caption,
      marginTop: spacing.sm,
    },
    description: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.sm,
      lineHeight: 21,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    rate: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.success,
      flexShrink: 1,
    },
  });

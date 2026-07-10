import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Application } from '@/types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Card } from './Card';
import { Tag } from './Tag';

interface ApplicantCardProps {
  application: Application;
  onShortlist: () => void;
  onDecline: () => void;
  shortlisting?: boolean;
  declining?: boolean;
  onPress?: () => void;
}

export function ApplicantCard({
  application,
  onShortlist,
  onDecline,
  shortlisting,
  declining,
  onPress,
}: ApplicantCardProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const { applicant, status, coverLetter } = application;
  const decided = status !== 'pending';
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Avatar name={applicant.name} color={applicant.avatarColor} size={56} />
        <View style={styles.body}>
          <Text style={styles.name}>{applicant.name}</Text>
          <Text style={styles.meta}>
            {applicant.title} · {applicant.rating.toFixed(1)} ★
          </Text>
        </View>
        {decided ? (
          <Tag
            label={status === 'shortlisted' ? 'Accepted' : 'Rejected'}
            variant={status === 'shortlisted' ? 'green' : 'grey'}
          />
        ) : null}
      </View>

      <View style={styles.quote}>
        <Text style={styles.quoteText} numberOfLines={2}>
          “{coverLetter}
        </Text>
      </View>

      {!decided ? (
        <View style={styles.actions}>
          <Button
            label="Accept"
            onPress={onShortlist}
            compact
            loading={shortlisting}
            style={styles.action}
          />
          <Button
            label="Reject"
            onPress={onDecline}
            variant="outline"
            compact
            loading={declining}
            style={styles.action}
          />
        </View>
      ) : null}
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
    },
    body: {
      flex: 1,
      marginLeft: spacing.md,
    },
    name: {
      ...typography.headingM,
    },
    meta: {
      ...typography.caption,
      marginTop: 2,
    },
    quote: {
      backgroundColor: colors.background,
      borderRadius: radius.input,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    quoteText: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    actions: {
      flexDirection: 'row',
      marginTop: spacing.md,
      gap: spacing.md,
    },
    action: {
      flex: 1,
    },
  });

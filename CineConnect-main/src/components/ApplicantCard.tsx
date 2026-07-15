import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  /** `force` is true only when confirming a change to an already-final decision (the "Edit decision" flow). */
  onShortlist: (force?: boolean) => void;
  onDecline: (force?: boolean) => void;
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
  // A final decision (Accepted/Rejected) is locked by default — requirement
  // #4. The producer must explicitly tap "Edit decision" to reveal the
  // Accept/Reject controls again; this local flag never changes what's
  // persisted, only whether the controls are shown.
  const [editing, setEditing] = useState(false);
  const showActions = !decided || editing;

  const handleShortlist = () => {
    onShortlist(decided);
    setEditing(false);
  };
  const handleDecline = () => {
    onDecline(decided);
    setEditing(false);
  };

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

      {showActions ? (
        <View style={styles.actions}>
          <Button
            label="Accept"
            onPress={handleShortlist}
            compact
            loading={shortlisting}
            style={styles.action}
          />
          <Button
            label="Reject"
            onPress={handleDecline}
            variant="outline"
            compact
            loading={declining}
            style={styles.action}
          />
          {editing ? (
            <Pressable onPress={() => setEditing(false)} hitSlop={8} style={styles.cancelEdit}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.editRow}>
          <Text style={styles.editText}>Edit decision</Text>
        </Pressable>
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
      alignItems: 'center',
      marginTop: spacing.md,
      gap: spacing.md,
    },
    action: {
      flex: 1,
    },
    editRow: {
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    editText: {
      ...typography.caption,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    cancelEdit: {
      paddingHorizontal: spacing.xs,
    },
    cancelEditText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { MessageRequest } from '@/types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Card } from './Card';

interface RequestCardProps {
  request: MessageRequest;
  onAccept: () => void;
  onDecline: () => void;
  accepting?: boolean;
  declining?: boolean;
}

export function RequestCard({
  request,
  onAccept,
  onDecline,
  accepting,
  declining,
}: RequestCardProps) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Avatar name={request.fromName} color={request.avatarColor} size={56} />
        <View style={styles.body}>
          <Text style={styles.name}>{request.fromName}</Text>
          <Text style={styles.meta}>
            {request.fromRole} · {request.rating.toFixed(1)} ★
          </Text>
        </View>
      </View>

      <View style={styles.quote}>
        <Text style={styles.quoteText}>“{request.preview}”</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Accept" onPress={onAccept} compact loading={accepting} style={styles.action} />
        <Button
          label="Decline"
          onPress={onDecline}
          variant="outline"
          compact
          loading={declining}
          style={styles.action}
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

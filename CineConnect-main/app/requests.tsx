import { StyleSheet, Text } from 'react-native';

import { RequestList } from '@/components/RequestList';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export default function MessageRequestsScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.heading}>Message Requests</Text>
      <Text style={styles.subtitle}>Accept to start a conversation</Text>
      <RequestList />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...typography.headingXL,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

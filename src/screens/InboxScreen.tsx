import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useConversations, useMessageRequests } from '@/api/messages';
import { ConversationRow } from '@/components/ConversationRow';
import { RequestList } from '@/components/RequestList';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { spacing } from '@/constants/layout';

import { ThemeColors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
export function InboxScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const router = useRouter();
  const [tab, setTab] = useState<'chats' | 'requests'>('chats');
  const { data, isLoading, isError } = useConversations();
  const { data: requests } = useMessageRequests();

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
      </View>

      <SegmentedTabs
        tabs={[
          { key: 'chats', label: 'Chats' },
          { key: 'requests', label: 'Requests', badge: requests?.length },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'chats' | 'requests')}
      />

      {tab === 'chats' ? (
        isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(c) => c.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ConversationRow
                conversation={item}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            )}
            ListEmptyComponent={<EmptyState emoji="💬" label="No conversations yet." />}
          />
        )
      ) : (
        <View style={styles.requests}>
          <RequestList />
        </View>
      )}
    </ScreenContainer>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heading: {
    ...typography.headingXL,
  },
  requests: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});

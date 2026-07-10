import { FlatList, StyleSheet } from 'react-native';

import { useMessageRequests, useRequestActions } from '@/api/messages';
import { spacing } from '@/constants/layout';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { RequestCard } from './RequestCard';

/** Message-request list body, shared by the inbox Requests tab and /requests. */
export function RequestList() {
  const { data, isLoading, isError } = useMessageRequests();
  const { accept, decline } = useRequestActions();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          onAccept={() => accept.mutate(item.id)}
          onDecline={() => decline.mutate(item.id)}
          accepting={accept.isPending && accept.variables === item.id}
          declining={decline.isPending && decline.variables === item.id}
        />
      )}
      ListEmptyComponent={<EmptyState emoji="📨" label="No pending message requests." />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});

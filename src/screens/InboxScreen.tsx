import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useConversations } from '@/api/messages';
import { useAllUsers } from '@/api/users';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ConversationRow } from '@/components/ConversationRow';
import { Pill } from '@/components/Pill';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';

const ROLE_FILTERS = ['All', 'Freelancer', 'Producer', 'Client'] as const;

export function InboxScreen() {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const router = useRouter();
  const [tab, setTab] = useState<'chats' | 'discover'>('chats');
  const { data, isLoading, isError } = useConversations();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const { data: allUsers, isLoading: usersLoading } = useAllUsers(search, roleFilter);

  const openChat = (userId: string) => router.push(`/chat/${userId}`);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
      </View>

      <SegmentedTabs
        tabs={[
          { key: 'chats', label: 'Chats' },
          { key: 'discover', label: 'Discover' },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'chats' | 'discover')}
      />

      {tab === 'chats' ? (
        isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState label="Couldn't load your messages. Check your connection and try again." />
        ) : (
          <FlatList
            data={data ?? []}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ConversationRow conversation={item} onPress={() => openChat(item.participantId)} />
            )}
            ListEmptyComponent={
              <EmptyState emoji="💬" label="No conversations yet — tap Discover to message someone." />
            }
          />
        )
      ) : (
        <View style={styles.discover}>
          <View style={styles.searchWrap}>
            <SearchBar placeholder="Search by name..." value={search} onChangeText={setSearch} />
          </View>
          <View style={styles.pills}>
            {ROLE_FILTERS.map((r) => (
              <Pill key={r} label={r} active={r === roleFilter} onPress={() => setRoleFilter(r)} />
            ))}
          </View>

          {usersLoading ? (
            <LoadingState />
          ) : (
            <FlatList
              data={allUsers ?? []}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <UserRow user={item} onPress={() => openChat(item.id)} />}
              ListEmptyComponent={<EmptyState emoji="🔎" label="No users match your search." />}
            />
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

function UserRow({ user, onPress }: { user: User; onPress: () => void }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  return (
    <Card onPress={onPress} style={styles.userRow}>
      <Avatar name={user.name} color={user.avatarColor} size={48} />
      <View style={styles.userBody}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.userMeta}>{roleLabel}</Text>
      </View>
      <Text style={styles.messageIcon}>✉️</Text>
    </Card>
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
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    discover: {
      flex: 1,
    },
    searchWrap: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    userBody: {
      flex: 1,
      marginLeft: spacing.md,
    },
    userName: {
      ...typography.headingM,
      fontSize: 16,
    },
    userMeta: {
      ...typography.caption,
      marginTop: 2,
    },
    messageIcon: {
      fontSize: 20,
    },
  });

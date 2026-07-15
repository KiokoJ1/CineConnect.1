import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAdminUsers as useAdminUserList } from '@/api/admin';
import { useUserModeration } from '@/api/users';
import { Avatar } from '@/components/Avatar';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { User } from '@/types';

const FILTERS = ['All', 'Freelancer', 'Producer', 'Client'] as const;

export default function ManageUsersScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const { data, isLoading, isError, refetch, isRefetching } = useAdminUserList(search, filter);
  const { suspend, restore } = useUserModeration();
  const { colors, typography } = useTheme();
  const { isTablet } = useResponsive();
  const styles = getStyles(colors, typography);

  // 2-across on tablet/web-wide, single column on phone — re-keyed so
  // FlatList re-lays-out cleanly when the column count changes (e.g.
  // rotating a tablet or resizing a browser window).
  const numColumns = isTablet ? 2 : 1;

  return (
    <ScreenContainer>
      <BackHeader label="Manage Users" emphasis="bold" />

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search users..." value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.pills}>
        {FILTERS.map((f) => (
          <Pill key={f} label={f} active={f === filter} onPress={() => setFilter(f)} />
        ))}
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <ErrorState label="Couldn't load users. Check your connection and try again." />
          <Button label={isRefetching ? 'Retrying…' : 'Retry'} onPress={() => refetch()} disabled={isRefetching} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={data ?? []}
          keyExtractor={(u) => u.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              wide={numColumns > 1}
              onSuspend={() => suspend.mutate(item.id)}
              onRestore={() => restore.mutate(item.id)}
              busy={
                (suspend.isPending && suspend.variables === item.id) ||
                (restore.isPending && restore.variables === item.id)
              }
            />
          )}
          ListEmptyComponent={<EmptyState emoji="👥" label="No users match your search." />}
        />
      )}
    </ScreenContainer>
  );
}

function UserRow({
  user,
  onSuspend,
  onRestore,
  busy,
  wide,
}: {
  user: User;
  onSuspend: () => void;
  onRestore: () => void;
  busy: boolean;
  wide: boolean;
}) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  const suspended = user.status === 'suspended';
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  return (
    <Card style={[styles.row, wide && styles.rowWide]}>
      <Avatar name={user.name} color={user.avatarColor} size={56} muted={suspended} />
      <View style={styles.body}>
        <Text style={[styles.name, suspended && styles.muted]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {roleLabel} · {suspended ? 'Suspended' : 'Active'}
        </Text>
      </View>
      {suspended ? (
        <Button label="Restore" variant="success-outline" compact onPress={onRestore} loading={busy} />
      ) : (
        <Button label="Suspend" variant="outline" compact onPress={onSuspend} loading={busy} />
      )}
    </Card>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    searchWrap: {
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.lg,
    },
    list: {
      paddingBottom: spacing.xxl,
    },
    columnWrapper: {
      gap: spacing.lg,
    },
    errorWrap: {
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    rowWide: {
      flex: 1,
    },
    body: {
      flex: 1,
      marginLeft: spacing.md,
      marginRight: spacing.sm,
    },
    name: {
      ...typography.headingM,
    },
    muted: {
      color: colors.textMuted,
    },
    meta: {
      ...typography.caption,
      marginTop: 2,
    },
  });

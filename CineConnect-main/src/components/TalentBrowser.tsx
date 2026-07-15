import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useTalent } from '@/api/users';
import { TALENT_CATEGORIES } from '@/constants/categories';
import { spacing } from '@/constants/layout';
import { Pill } from './Pill';
import { SearchBar } from './SearchBar';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { TalentCard } from './TalentCard';

/** Search + category pills + talent results list, without an outer heading. */
export function TalentBrowser() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const { data, isLoading, isError } = useTalent(search, category);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <SearchBar
          placeholder="Search by name or skill..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.pillsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TALENT_CATEGORIES as unknown as string[]}
          keyExtractor={(c) => c}
          renderItem={({ item }) => (
            <Pill label={item} active={item === category} onPress={() => setCategory(item)} />
          )}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TalentCard user={item} onPress={() => router.push(`/talent/${item.id}`)} />
          )}
          ListEmptyComponent={<EmptyState emoji="🔍" label="No talent matches your search." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    marginBottom: spacing.lg,
  },
  pillsWrap: {
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
